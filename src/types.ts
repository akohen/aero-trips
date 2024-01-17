export type Airfield = {
  codeIcao: string,
  name?: string,
}

export type Data = {
  airfields?: Airfield[],
}