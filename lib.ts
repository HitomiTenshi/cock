export interface Config {
  layerPath: string;
  outputPath: string;
  countFrom: number;
  outputAmount: number;
  randomize: boolean;
  layerOrder: string[];
}

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

export function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const x = Math.floor(Math.random() * (i + 1));
    [list[i], list[x]] = [list[x], list[i]];
  }
}
