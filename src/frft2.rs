#![cfg(feature = "frft2")]

use crate::conv_length;
use crate::iter_into_slice;
use crate::sinc::sinc;
use crate::Arc;
use crate::Complex;
use crate::Convolver;
use crate::Fft;
use crate::FftPlanner;
use std::f32::consts::PI;

/// Implementation based on the matlab code
/// provided at https://nalag.cs.kuleuven.be/research/software/FRFT/
/// https://nalag.cs.kuleuven.be/research/software/FRFT/frft2.m
///
/// function [Faf] = frft2(f,a)
/// % The fast Fractional Fourier Transform
/// % input: f = samples of the signal
/// %        a = fractional power
/// % output: Faf = fast Fractional Fourier transform
///
/// error(nargchk(2, 2, nargin));
///
/// f0 = f(:);
/// N = length(f);
/// shft = rem((0:N-1)+fix(N/2),N)+1;
/// sN = sqrt(N);
/// a = mod(a,4);
///
/// % do special cases
/// if (a==0), Faf = f0; return; end;
/// if (a==2), Faf = flipud(f0); return; end;
/// if (a==1), Faf(shft,1) = fft(f0(shft))/sN; return; end
/// if (a==3), Faf(shft,1) = ifft(f0(shft))*sN;return; end
///
/// % reduce to interval 0.5 < a < 1.5
/// if (a>2.0), a = a-2; f0 = flipud(f0); end
/// if (a>1.5), a = a-1; f0(shft,1) = fft(f0(shft))/sN; end
/// if (a<0.5), a = a+1; f0(shft,1) = ifft(f0(shft))*sN; end
///
/// % precompute some parameters
/// alpha=a*pi/2;
/// s = pi/(N+1)/sin(alpha)/4;
/// t = pi/(N+1)*tan(alpha/2)/4;
/// Cs = sqrt(s/pi)*exp(-i*(1-a)*pi/4);
///
/// % sinc interpolation
/// f1 = fconv(f0,sinc([-(2*N-3):2:(2*N-3)]'/2),1);
/// f1 = f1(N:2*N-2);
///
/// % chirp multiplication
/// chrp = exp(-i*t*(-N+1:N-1)'.^2);
/// l0 = chrp(1:2:end); l1=chrp(2:2:end);
/// f0 = f0.*l0;        f1=f1.*l1;
///
/// % chirp convolution
/// chrp = exp(i*s*[-(2*N-1):(2*N-1)]'.^2);
/// e1 = chrp(1:2:end);  e0 = chrp(2:2:end);
/// f0 = fconv(f0,e0,0); f1 = fconv(f1,e1,0);
/// h0 = ifft(f0+f1);
///
/// Faf = Cs*l0.*h0(N:2*N-1);
///
/// %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
/// function z = fconv(x,y,c)
/// % convolution by fft
///
/// N = length([x(:);y(:)])-1;
/// P = 2^nextpow2(N);
/// z = fft(x,P) .* fft(y,P);
/// if c ~= 0,
///   z = ifft(z);
///   z = z(N:-1:1);
/// end

pub struct Frft2 {
    fft_integer: Arc<dyn Fft<f32>>,
    convolver: Convolver,

    f1: Vec<Complex<f32>>,
    f0c: Vec<Complex<f32>>,
    f1c: Vec<Complex<f32>>,
    h0: Vec<Complex<f32>>,
}

impl Frft2 {
    pub fn new(length: usize) -> Self {
        let sinc_len = 2 * length - 1;
        let fft_conv_len = conv_length(length, sinc_len);

        let mut planner = FftPlanner::new();
        let fft_integer = planner.plan_fft_forward(length);

        Self {
            fft_integer,
            convolver: Convolver::new(fft_conv_len),
            f1: vec![Complex::default(); fft_conv_len],
            f0c: vec![Complex::default(); fft_conv_len],
            f1c: vec![Complex::default(); fft_conv_len],
            h0: vec![Complex::default(); fft_conv_len],
        }
    }

    pub fn process(&mut self, signal: &mut [Complex<f32>], fraction: f32) {
        let _ = self.process_internal(signal, fraction);
    }

    pub fn process_scaled(&mut self, signal: &mut [Complex<f32>], fraction: f32) {
        let scale = f32::sqrt(self.process_internal(signal, fraction));

        for v in signal.iter_mut() {
            v.re *= scale;
            v.im *= scale;
        }
    }

    fn chirps(
        &self,
        n: usize,
        a: f32,
    ) -> (
        impl Iterator<Item = Complex<f32>> + Clone,
        impl Iterator<Item = Complex<f32>> + Clone,
    ) {
        let f_n = n as f32;
        let alpha = a * PI / 2.0;
        let s = PI / (f_n + 1.0) / alpha.sin() / 4.0;
        let t = PI / (f_n + 1.0) * (alpha / 2.0).tan() / 4.0;
        // chrp = exp(-i*t*(-N+1:N-1)'.^2);
        let chirp_a = (0..(2 * n - 1))
            .map(move |i| -f_n + 1.0 + i as f32)
            .map(move |x| Complex::<f32>::new(0.0, -1.0 * t * x * x).exp());
        // chrp = exp(i*s*[-(2*N-1):(2*N-1)]'.^2);
        let chirp_b = (0..(4 * n - 1))
            .map(move |i| -(2.0 * f_n - 1.0) + i as f32)
            .map(move |x| Complex::<f32>::new(0.0, 1.0 * s * x * x).exp());

        (chirp_a, chirp_b)
    }

    fn sinc(&self, n: usize) -> impl Iterator<Item = Complex<f32>> {
        let f_n = n as f32;

        (0..(2 * n - 1))
            .map(move |i| -(2.0 * f_n - 3.0) + 2.0 * i as f32)
            .map(|x| sinc(x) * 0.5)
    }

    fn preprocess(&self, frac: &mut [Complex<f32>], fraction: f32) -> (f32, Option<f32>) {
        let n = frac.len();
        let f_n = n as f32;
        let mut a = (fraction + 4.0).rem_euclid(4.0);

        if a == 0.0 {
            (1.0, None)
        } else if a == 1.0 {
            frac.rotate_right(n / 2);
            self.fft_integer.process(frac);
            frac.rotate_right(n / 2);

            return (1.0 / f_n, None);
        } else if a == 2.0 {
            frac.reverse();
            frac.rotate_right(1);

            return (1.0, None);
        } else if a == 3.0 {
            frac.rotate_right(n / 2);
            self.fft_integer.process(frac);
            frac.rotate_right(n / 2);
            frac.reverse();
            frac.rotate_right(1);

            return (1.0 / f_n, None);
        } else {
            let mut scale_factor = 1.0;

            if a > 2.0 {
                frac.reverse();
                frac.rotate_right(1);
                a -= 2.0;
            }

            if a > 1.5 {
                a -= 1.0;
                frac.rotate_right(n / 2);
                self.fft_integer.process(frac);
                frac.rotate_right(n / 2);

                scale_factor /= f_n;
            }
            if a < 0.5 {
                a += 1.0;

                frac.rotate_right(n / 2);
                frac.reverse();
                frac.rotate_right(1);
                self.fft_integer.process(frac);
                frac.rotate_right(n / 2);

                scale_factor *= f_n;
            }

            return (scale_factor, Some(a));
        }
    }

    fn process_internal(&mut self, frac: &mut [Complex<f32>], fraction: f32) -> f32 {
        let n = frac.len();
        let f_n = n as f32;

        let (scale_factor, adjusted_a) = self.preprocess(frac, fraction);

        if let Some(a) = adjusted_a {
            let alpha = a * PI / 2.0;
            let s = PI / (f_n + 1.0) / alpha.sin() / 4.0;
            let cs = Complex::<f32>::new(0.0, -1.0 * (1.0 - a) * PI / 4.0).exp() / (s / PI).sqrt();

            let (chirp_a, chirp_b) = self.chirps(n, a);

            let sinc_iter = self.sinc(n);

            self.convolver
                .conv(frac.iter().cloned(), sinc_iter, &mut self.f1);
            let f1_slice = self.f1[n..(2 * n - 1)].iter().rev();

            let l0 = chirp_a.clone().step_by(2);
            let l1 = chirp_a.skip(1).step_by(2);
            let e0 = chirp_b.clone().step_by(2);
            let e1 = chirp_b.skip(1).step_by(2);

            let f0m_iter = frac.iter().zip(l0.clone()).map(|(a, b)| a * b);
            let f1m_iter = f1_slice.zip(l1).map(|(a, b)| a * b);

            self.convolver.conv_spectral(f0m_iter, e0, &mut self.f0c);
            self.convolver.conv_spectral(f1m_iter, e1, &mut self.f1c);

            iter_into_slice(
                self.f0c.iter().zip(self.f1c.iter()).map(|(a, b)| a + b),
                &mut self.h0,
            );
            self.convolver.fft(&mut self.h0);
            self.h0.reverse();
            self.h0.rotate_right(1);

            let result = l0
                .enumerate()
                .map(|(i, l)| cs * l * self.h0[n + i] * f32::sqrt(f_n));
            iter_into_slice(result, frac);
        }

        scale_factor
    }
}

#[cfg(test)]
mod tests {
    use crate::Complex;
    use crate::frft2::Frft2;

    #[test]
    fn frft2_0() {
        let mut frft = Frft2::new(4);
        let mut signal = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        let expected = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        frft.process_scaled(&mut signal, 0.0);
        assert_eq!(expected, signal);
    }

    #[test]
    fn frft2_1() {
        let mut frft = Frft2::new(4);
        let mut signal = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        let expected = [
            Complex::new(0.5, 0.0),
            Complex::new(-0.5, 0.0),
            Complex::new(0.5, 0.0),
            Complex::new(-0.5, 0.0),
        ];

        frft.process_scaled(&mut signal, 1.0);
        assert_eq!(expected, signal);
    }

    #[test]
    fn frft2_2() {
        let mut frft = Frft2::new(4);
        let mut signal = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        let expected = [
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(1.0, 0.0),
        ];

        frft.process_scaled(&mut signal, 2.0);
        assert_eq!(expected, signal);
    }

    #[test]
    fn frft2_3() {
        let mut frft = Frft2::new(4);
        let mut signal = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        let expected = [
            Complex::new(0.5, 0.0),
            Complex::new(-0.5, 0.0),
            Complex::new(0.5, 0.0),
            Complex::new(-0.5, 0.0),
        ];

        frft.process_scaled(&mut signal, 3.0);
        assert_eq!(expected, signal);
    }

    #[test]
    fn frft2_4() {
        let mut frft = Frft2::new(4);
        let mut signal = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        let expected = [
            Complex::new(1.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
            Complex::new(0.0, 0.0),
        ];

        frft.process_scaled(&mut signal, 4.0);
        assert_eq!(expected, signal);
    }
}
