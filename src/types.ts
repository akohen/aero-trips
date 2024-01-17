export type Airfield = {
  codeOaci: string,
  name?: string,
}

export type Data = {
  airfields: Airfield[],
}