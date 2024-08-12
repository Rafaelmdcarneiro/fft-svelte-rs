use crate::sinc::sinc;

use crate::Complex;
use crate::Convolver;

pub struct Interpolator {
    len: usize,
    convolver: Convolver,
    conv_result: Vec<Complex<f32>>,
}

// matlab code:
// function xint=interp(x)
// % sinc interpolation
// N = length(x);
// y = zeros(2*N-1,1);
// y(1:2:2*N-1) = x;
// xint = fconv(y(1:2*N-1), sinc([-(2*N-3):(2*N-3)]'/2));
// xint = xint(2*N-2:end-2*N+3);

impl Interpolator {
    const fn conv_length(length: usize) -> usize {
        (length * 3 - 1) + (3 * length - 5) - 1
    }

    fn sinc_iter(length: isize) -> impl Iterator<Item = Complex<f32>> {
        ((-2 * length + 3)..(2 * length - 2)).map(|x| sinc(x as f32 / 2.0))
    }

    const fn slice_range(length: usize) -> std::ops::Range<usize> {
        (2 * length - 4)..(Self::conv_length(length) - 2 * length + 2)
    }

    pub const fn result_len(length: usize) -> usize {
        let r = Self::slice_range(length);

        r.end - r.start
    }

    pub fn new(length: usize) -> Self {
        Self {
            len: length,
            convolver: Convolver::new(Interpolator::conv_length(length)),
            conv_result: vec![Complex::default(); Interpolator::conv_length(length)],
        }
    }

    pub fn interp<'s, 'c>(
        &'s mut self,
        signal: impl Iterator<Item = &'c Complex<f32>> + Clone,
    ) -> &'s [Complex<f32>] {
        let interspersed = signal.clone().cloned().intersperse(Complex::default());

        self.convolver.conv(
            interspersed,
            Self::sinc_iter(self.len as isize),
            &mut self.conv_result,
        );

        &self.conv_result[Self::slice_range(self.len)]
    }

    // expected python results
    // sincinterp(np.array([1, 2, 3]) -> [1.         1.27323954 2.         2.97089227 3.        ]
    // sincinterp(np.array([]) -> error
    // sincinterp(np.array([1]) -> []
    // sincinterp(np.array([1,2]) -> [1.         1.90985932 2.        ]
    // sincinterp(np.array([1,1]) -> [1.         1.27323954 1.        ]
    // sincinterp(np.array([0,0]) -> [0. 0. 0.]
    // sincinterp(np.array([1,0]) -> [1.00000000e+00 6.36619772e-01 4.44089210e-17]
    // sincinterp(np.array([0,1]) -> [8.88178420e-17 6.36619772e-01 1.00000000e+00]
    // sincinterp(np.array([0,1,0]) -> [1.85037171e-17 6.36619772e-01 1.00000000e+00 6.36619772e-01 1.85037171e-17]
    // sincinterp(np.array([1,1,1]) -> [1.         1.06103295 1.         1.06103295 1.        ]

    // expected matlab results
    // interp([1,2,3]) -> [1.0000,1.2732,2.0000,2.9709,3.0000]
    // interp([]) -> error
    // interp([0]) -> error
    // interp([1,2]) -> [1.0000, 1.9099, 2.0000]
    // interp([1,1]) -> [1.0000,1.2732, 1.0000]
    // interp([0,0]) -> [0,0,0]
    // interp([0,1,0]) -> [-5.5511e-17, 6.3662e-01, 1.0000e+00, 6.3662e-01, 1.3878e-17]
    // interp([1,1,1]) -> [1.0000, 1.0610, 1.0000, 1.0610, 1.0000]
}

#[cfg(test)]
mod tests {

    use crate::sinc_interp::Interpolator;
    use crate::Complex;
    use assert_approx_eq::assert_approx_eq;

    #[test]
    fn test_interp() {
        let signal = [
            Complex::new(1.0, 0.0),
            Complex::new(2.0, 0.0),
            Complex::new(3.0, 0.0),
        ];
        let mut interpolator = Interpolator::new(3);

        let result = interpolator.interp(signal.iter());
        let expected = [
            Complex::new(1., 0.0),
            Complex::new(1.273_239_5, 0.0),
            Complex::new(2., 0.0),
            Complex::new(2.970_892_2, 0.0),
            Complex::new(3., 0.0),
        ];

        assert_eq!(5, result.len());
        for (e, r) in expected.iter().zip(result.iter()) {
            assert_approx_eq!(e.re, r.re, 1e-4);
            assert_approx_eq!(e.im, r.im, 1e-4);
        }
    }
}
