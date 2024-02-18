export const uid = () => {
  const firstPart = (Math.random() * 46656) | 0;
  const secondPart = (Math.random() * 46656) | 0;
  const firstPartStr = ("000" + firstPart.toString(36)).slice(-3);
  const secondPartStr = ("000" + secondPart.toString(36)).slice(-3);
  return firstPartStr + secondPartStr;
}
