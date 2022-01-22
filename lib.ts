export function* cartesian(...list: any[]): any {
  const head = list[0];
  const tail = list.slice(1);
  const remainder = tail.length ? cartesian(...tail) : [[]];
  for (const r of remainder) for (const h of head) yield [h, ...r];
}
