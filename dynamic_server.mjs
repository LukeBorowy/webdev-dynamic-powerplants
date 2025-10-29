
import * as fs from "node:fs";
import * as path from "node:path";
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
const db = new sqlite3.Database('powerplants.sqlite');

let port = 8080;
let app = express();
let public_dir = "./public";
let templates_dir = "./templates";


app.use(express.static(public_dir));
app.get("/source/:source", (req, res) => {
    fs.readFile(path.join(templates_dir, "source.html"), (err, data) => {

    });
});

app.get("/country/:country", (req, res) => {
    fs.readFile(path.join(templates_dir, "country.html"), (err, data) => {
        let country = decodeURI(req.params.country);
        db.all("SELECT * FROM powerplant WHERE country==?", country, (err, rows) => {
            if (err) {
                res.status(500).type("txt").send("<h1>500 sql error</h1>");
                console.log(err);
                res.end();
            } else {
                let table_str = "";
                for (let plant of rows) {
                    let thisRow = `<tr><td><a href="/powerplant/${plant.gppd_idnr}">${plant.name}</a></td><td>${plant.capacity_mw}</td></tr>`;
                    table_str += thisRow;
                }
                let str_data = data.toString();
                str_data = str_data.replaceAll("{{country}}", rows[0].country_long);
                str_data = str_data.replace("{{table_data}}", table_str);
                str_data = str_data.replace("{{header}}", "<th>Name</th><th>Capacity</th>");
                let query = "SELECT primary_fuel, sum(capacity_mw) AS capacity_mw, count(*) as fuel_count FROM powerplant WHERE country == ? GROUP BY primary_fuel;";
                db.all(query, country, (err, rows) => {
                    if (err) {
                        res.status(500).type("txt").send("<h1>500 sql error</h1>");
                        console.log(err);
                        res.end();
                    } else {
                        let fuel_capacity = [];
                        let fuel_count = [];
                        for (let row of rows) {
                            fuel_capacity.push("{label:\"" + row.primary_fuel + "\", y:" + row.capacity_mw + "}");
                            fuel_count.push("{label:\"" + row.primary_fuel + "\", y:" + row.fuel_count + "}");
                        }
                        fuel_capacity = fuel_capacity.join();
                        fuel_count = fuel_count.join();
                        str_data = str_data.replace("{{capacity_data}}", fuel_capacity);
                        str_data = str_data.replace("{{count_data}}", fuel_count);
                        res.status(200).type("html").send(str_data);
                        res.end();
                    }
                });
            }
        });
    });
});
app.get("/year/:year", (req, res) => {
    fs.readFile(path.join(templates_dir, "year.html"), (err, data) => {

    });
});
app.get("/powerplant/:id", (req, res) => {
    // Only show: Name, calories, carbs, protein, fat, sugar
    fs.readFile(path.join(templates_dir, "powerplant.html"), (err, data) => {
        db.get("SELECT * from powerplant WHERE gppd_idnr==?", req.params.id, (err, row) => {
            if (err) {
                res.status(500).type("txt").send("<h1>500 sql error</h1>");
                console.log(err);
            } else {
                let used_stats = [["capacity_mw", "Capacity"], ["primary_fuel", "Fuel"]];

                let table_str = "";
                for (let stat of used_stats) {
                    let thisRow = `<tr><td>${stat[1]}</td><td>${row[stat[0]]}</td></tr>`;
                    table_str += thisRow;
                }
                let str_data = data.toString();
                str_data = str_data.replaceAll("{{name}}", row.name);
                str_data = str_data.replace("{{table_data}}", table_str);
                res.status(200).type("html").send(str_data);
            };
            res.end();
        });
    });
});

app.get("/", (req, res) => {
    fs.readFile(path.join(templates_dir, "index.html"), (err, data) => {
        if (err) {
            res.status(500).type("txt").send("<h1>500 server error</h1>");
            res.end();
        } else {
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