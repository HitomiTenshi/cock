export class LayerSize {
  constructor(public width = 0, public height = 0) {}
}

function* _cartesian<T>(...list: T[][]): Generator<T[]> {
  const head = list[0];
  const tail = list.slice(1);
  const remainder = tail.length ? _cartesian(...tail) : ([[]] as T[][]);
  for (const r of remainder) for (const h of head) yield [h, ...r];
}

export function cartesian<T>(...list: T[][]) {
  return [..._cartesian(...list)];
}
