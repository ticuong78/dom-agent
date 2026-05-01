import { read, readFileSync } from "fs";
import * as cheerio from "cheerio";

function readHtmls(fileStr: string) {
  return readFileSync(fileStr).toString();
}

const document = cheerio.load(readHtmls("artifacts\\family_tree.html"));
const root = document.root();

console.log(root.contents());
