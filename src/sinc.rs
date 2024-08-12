use crate::Complex;
use std::f32::consts::PI;

pub fn sinc(x: f32) -> Complex<f32> {
    if x == 0.0 {
        Complex::new(1.0, 0.0)
    } else {
        Complex::new(f32::sin(PI * x) / (PI * x), 0.0)
    }
}
