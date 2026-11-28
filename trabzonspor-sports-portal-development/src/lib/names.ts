/** Türkçe karakterlere dayanıklı ad yardımcıları (istemci + sunucu). */

export function lastName(name: string) {
  const parts = name.trim().split(" ");
  return (parts[parts.length - 1] || name).toLocaleUpperCase("tr-TR");
}

const fold = (s: string) =>
  s
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

export function samePlayer(a: string, b: string) {
  return fold(a) === fold(b);
}
