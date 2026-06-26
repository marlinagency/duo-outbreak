export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const normalize = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
};
