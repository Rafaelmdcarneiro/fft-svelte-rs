pub fn iter_into_slice<T>(iter: impl Iterator<Item = T>, slice: &mut [T]) {
    for (old, it) in slice.iter_mut().zip(iter) {
        *old = it
    }
}
