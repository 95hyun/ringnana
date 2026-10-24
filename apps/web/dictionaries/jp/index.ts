import common from "./common";
import h2 from "./h2";
import h3 from "./h3";
import h4 from "./h4";
import legal from "./legal";
import doctors from "./doctors";
import booking from "./booking";
import visit from "./visit";

const dict = { common, h2, h3, h4, legal, doctors, booking, visit };

export type Dict = typeof dict;
export default dict;
