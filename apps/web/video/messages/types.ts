// ko 문구는 ja와 같은 키 구조여야 한다 — 값은 문자열이면 된다
export type Messages<T> = { [K in keyof T]: T[K] extends string ? string : Messages<T[K]> };
