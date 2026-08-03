import * as cheerio from "cheerio";

const root = `
    <nav>
      We are having a good time
        <div>
          Div of no where 1
          <main>
            Div of no where 2
              <div>
                Div of no where 3
              </div>
          </main>
        </div>
    </nav>
`;

const $ = cheerio.load(root);

const someShit = $("div > main").data("need-to-watch", true);

// console.log(rootSelector);
console.log(Boolean(someShit.data("need-to-watch")));
console.log(someShit.find("div").html());
console.log(Boolean(someShit.find("div").data("need-to-watch")));

const someShit2 = $("div", someShit);

// console.log(someShit2.text());
// // console.log(someShit.data("need-to-watch"));

// // console.log(someShit.attr("data-need-to-watch"));

// console.log($.root().html());
