import * as fs from "node:fs";
import * as path from "node:path";
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
const db = new sqlite3.Database('powerplants.sqlite');

let port = 8080;
let app = express();
let public_dir = "./public";
let templates_dir = "./templates";
const cereal_stats = ["calories", "carbohydrates", "protein", "fat", "sugar"];
const full_stats = ["type", "calories", "carbohydrates", "protein", "fat", "sugar", "name"];
app.use(express.static(public_dir));
app.get("/source/:source", (req, res) => {
    // Only show: Name, calories, carbs, protein, fat, sugar
    fs.readFile(path.join(templates_dir, "source.html"), (err, data) => {
        db.serialize(function () {
            let cereals;
            db.all("SELECT * FROM Cereals WHERE mfr==?", req.params.mfr_id.toUpperCase(), (err, rows) => {
                if (err) {
                    res.status(500).type("txt").send("<h1>500 sql error</h1>");
                    res.writeHead(500, { "Content-Type": "text/plain" });
                    res.write("<h1>500 sql error</h1>");
                    console.log(err);
                    cereals = [];
                } else {
                    cereals = rows;

                }
            });
            db.get("SELECT name FROM manufacturers WHERE id==?", req.params.mfr_id.toUpperCase(), (err, row) => {
                if (err) {
                    res.status(500).type("txt").send("<h1>500 sql error</h1>");
                    console.log(err);
                    cereals = [];
                } else {
                    let header_str = "<td>Name</td>";
                    for (let stat of cereal_stats) {
                        header_str += `<td>${stat}</td>`;
                    }
                    let table_str = "";
                    for (let cereal of cereals) {
                        let thisRow = "<tr>";
                        thisRow += `<td><b><a href="/cereal/${cereal['name']}">${cereal['name']}</a><b></td>`;
                        for (let nutrient of cereal_stats) {
                            thisRow += `<td>${cereal[nutrient]}</td>`
                        }
                        thisRow += "</tr>";
                        table_str += thisRow;
                    }
                    let str_data = data.toString();
                    str_data = str_data.replace("{{nutrient_header}}", header_str);
                    str_data = str_data.replace("{{manuf_name}}", row.name);
                    str_data = str_data.replace("{{table_data}}", table_str);
                    res.status(200).type("html").send(str_data);
                };
                res.end();
            });
        });
    });
});
app.get("/country/:country", (req, res) => {
    fs.readFile(path.join(templates_dir, "country.html"), (err, data) => {
        db.serialize(function () {
            let cereal_name = decodeURI(req.params.cereal);
            db.get("SELECT * FROM Cereals join Types on Types.id==Cereals.type WHERE name==?", cereal_name, (err, rows) => {
                if (err) {
                    res.status(500).type("txt").send("<h1>500 sql error</h1>");
                    console.log(err);
                } else {
                    let cereal = rows;
                    let table_str = "";
                    for (let nutrient of full_stats) {
                        let thisRow = `<tr><td>${nutrient}</td><td>${cereal[nutrient]}</td></tr>`;
                        table_str += thisRow;
                    }
                    let str_data = data.toString();
                    str_data = str_data.replace("{{cereal_name}}", cereal.name);
                    str_data = str_data.replace("{{table_data}}", table_str);
                    res.status(200).type("html").send(str_data);
                }
                res.end();
            });
        });
    });
});
app.get("/year/:year", (req, res) => {
    fs.readFile(path.join(templates_dir, "year.html"), (err, data) => {
        db.serialize(function () {
            let cereal_name = decodeURI(req.params.cereal);
            db.get("SELECT * FROM Cereals join Types on Types.id==Cereals.type WHERE name==?", cereal_name, (err, rows) => {
                if (err) {
                    res.status(500).type("txt").send("<h1>500 sql error</h1>");
                    console.log(err);
                } else {
                    let cereal = rows;
                    let table_str = "";
                    for (let nutrient of full_stats) {
                        let thisRow = `<tr><td>${nutrient}</td><td>${cereal[nutrient]}</td></tr>`;
                        table_str += thisRow;
                    }
                    let str_data = data.toString();
                    str_data = str_data.replace("{{cereal_name}}", cereal.name);
                    str_data = str_data.replace("{{table_data}}", table_str);
                    res.status(200).type("html").send(str_data);
                }
                res.end();
            });
        });
    });
});
app.get("/", (req, res) => {
    fs.readFile(path.join(templates_dir, "index.html"), (err, data) => {
        if (err) {
            res.status(500).type("txt").send("<h1>500 server error</h1>");
            res.end();
        } else {
            let str_data = data.toString();
            db.all("SELECT DISTINCT COUNTRY,COUNTRY_LONG FROM powerplant", (err, rows) => {
                if (err) {
                    res.status(500).type("txt").send("<h1>500 sql error</h1>");
                    console.log(err);
                } else {
                    let list_str = "";
                    for (let country of rows) {
                        let thisRow = `<li><a href="/country/${country.country}">${country.country_long}</a></li>`;
                        list_str += thisRow;
                    }
                    let str_data = data.toString();
                    str_data = str_data.replace("{{country_list}}", list_str);
                    res.status(200).type("html").send(str_data);
                }
                res.end();
            });
        }
    });
});
app.listen(port, () => {
    console.log("Started on " + port);
});