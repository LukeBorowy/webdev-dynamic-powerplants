import * as fs from "node:fs";
import * as path from "node:path";
import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';
const db = new sqlite3.Database('powerplants.sqlite');

let port = 8080;
let app = express();
let public_dir = "./public";
let templates_dir = "./templates";
const detailed_stats = [
    ["capacity_mw", "Capacity (MW)"],
    ["primary_fuel", "Fuel"],
    ["country_long", "Country"],
    ["commissioning_year", "Commission Year"],
    ["estimated_generation_gwh_2017", "Estimated GWh 2017"],
    ["gppd_idnr", "GPPD Identifier"]
];
app.use(express.static(public_dir));

function addPrevNext(sort_field, link_field, link_prefix, current_val, str_data, callback) {
    db.all(`SELECT * FROM powerplant WHERE ${sort_field} > ? ORDER BY ${sort_field} LIMIT 1`, current_val, (err, rows) => {
        if (rows.length > 0) {
            let link_content = rows[0][link_field];
            if (sort_field.includes("FLOOR")) {
                link_content = Math.floor(parseFloat(link_content));
            }
            str_data = str_data.replace("{{next_url}}", `href='/${link_prefix}/${link_content}'`);
        } else {
            str_data = str_data.replace("{{next_url}}", "");
        }
        db.all(`SELECT * FROM powerplant WHERE ${sort_field} < ? ORDER BY ${sort_field} DESC LIMIT 1`, current_val, (err, rows) => {
            if (rows.length > 0) {
                let link_content = rows[0][link_field];
                if (sort_field.includes("FLOOR")) {
                    link_content = Math.floor(parseFloat(link_content));
                }
                str_data = str_data.replace("{{prev_url}}", `href='/${link_prefix}/${link_content}'`);
            } else {
                str_data = str_data.replace("{{prev_url}}", "");
            }
            callback(str_data);
        });
    });
}
app.get("/country/:country", (req, res) => {
    fs.readFile(path.join(templates_dir, "country.html"), (err, data) => {
        let country = decodeURI(req.params.country);
        db.all("SELECT * FROM powerplant WHERE country==? ORDER BY name", country, (err, rows) => {
            if (rows.length == 0) {
                res.status(404).type("html").send(`<h1>404 nothing found for country ${country}</h1>`).end();
                return;
            }
            let table_str = "";
            for (let plant of rows) {
                let thisRow = `<tr><td><a href="/powerplant/${plant.gppd_idnr}">${plant.name}</a></td>
                                        <td>${plant.capacity_mw}</td>
                                        <td>${plant.primary_fuel}</td>
                                        </tr>`;
                table_str += thisRow;
            }
            let str_data = data.toString();
            str_data = str_data.replaceAll("{{country}}", rows[0].country_long);
            str_data = str_data.replace("{{flag}}", `<img class='flag-img' src='/imgs/flags/${rows[0].country}.svg' alt='Flag of ${rows[0].country_long}'>`);
            str_data = str_data.replace("{{table_data}}", table_str);
            str_data = str_data.replace("{{header}}", "<th>Name</th><th>Capacity</th><th>Primary Fuel</th>");
            let orig_country_long = rows[0].country_long;
            addPrevNext("country_long", "country", "country", orig_country_long, str_data, (str_data) => {
                db.all("SELECT primary_fuel, sum(capacity_mw) AS capacity_mw, count(*) as fuel_count FROM powerplant WHERE country == ? GROUP BY primary_fuel", country, (err, rows) => {
                    if (err) {
                        res.status(500).type("html").send("<h1>500 sql error</h1>").end();
                        console.log(err);
                        return;
                    }
                    let fuel_capacity = [];
                    let fuel_count = [];
                    for (let row of rows) {
                        fuel_capacity.push("{label:\"" + row.primary_fuel + "\", y:" + row.capacity_mw + "}");
                        fuel_count.push("{label:\"" + row.primary_fuel + "\", y:" + row.fuel_count + "}");
                    }
                    fuel_capacity = fuel_capacity.join();
                    fuel_count = fuel_count.join();
                    str_data = str_data.replace("{{ capacity_data }}", fuel_capacity);
                    str_data = str_data.replace("{{ count_data }}", fuel_count);
                    res.status(200).type("html").send(str_data).end();

                });
            });
        });
    });
});
app.get("/source/:source", (req, res) => {
    fs.readFile(path.join(templates_dir, "source.html"), (err, data) => {
        let source = decodeURI(req.params.source);
        db.all("SELECT * FROM powerplant WHERE primary_fuel==? ORDER BY name", source, (err, rows) => {
            if (rows.length == 0) {
                res.status(404).type("html").send(`<h1>404 nothing found for source ${source}</h1>`).end();
                return;
            }
            let table_str = "";
            for (let plant of rows) {
                let thisRow = `<tr><td><a href="/powerplant/${plant.gppd_idnr}">${plant.name}</a></td>
                                        <td>${plant.capacity_mw}</td>
                                        <td>${plant.primary_fuel}</td>
                                        </tr>`;
                table_str += thisRow;
            }
            let str_data = data.toString();
            str_data = str_data.replaceAll("{{source}}", rows[0].primary_fuel);
            str_data = str_data.replace("{{table_data}}", table_str);
            str_data = str_data.replace("{{header}}", "<th>Name</th><th>Capacity</th><th>Primary Fuel</th>");
            addPrevNext("primary_fuel", "primary_fuel", "source", rows[0].primary_fuel, str_data, (str_data) => {
                res.status(200).type("html").send(str_data);
            });
        });
    });
});

app.get("/year/:year", (req, res) => {
    fs.readFile(path.join(templates_dir, "year.html"), (err, data) => {
        let year = decodeURI(req.params.year);
        db.all("SELECT * FROM powerplant WHERE FLOOR(commissioning_year) == CAST(? as INTEGER) ORDER BY name", year, (err, rows) => {
            if (rows.length == 0) {
                res.status(404).type("html").send(`<h1>404 nothing found for year ${year}</h1>`).end();
                return;
            }
            let table_str = "";
            for (let plant of rows) {
                let thisRow = `<tr><td><a href="/powerplant/${plant.gppd_idnr}">${plant.name}</a></td>
                                        <td>${plant.capacity_mw}</td>
                                        <td>${plant.primary_fuel}</td>
                                        </tr>`;
                table_str += thisRow;
            }
            let str_data = data.toString();
            str_data = str_data.replaceAll("{{year}}", year);
            str_data = str_data.replace("{{table_data}}", table_str);
            str_data = str_data.replace("{{header}}", "<th>Name</th><th>Capacity</th><th>Primary Fuel</th>");
            addPrevNext("FLOOR(commissioning_year)", "commissioning_year", "year", Math.floor(rows[0].commissioning_year), str_data, (str_data) => {
                res.status(200).type("html").send(str_data);
            });
        });
    });
});
app.get("/powerplant/:id", (req, res) => {
    fs.readFile(path.join(templates_dir, "powerplant.html"), (err, data) => {
        db.get("SELECT * from powerplant WHERE gppd_idnr==?", req.params.id, (err, row) => {
            if (!row) {
                res.status(404).type("html").send(`<h1>No data found for ${req.params.id}</h1>`).end();
                return;
            }


            let table_str = "";
            for (let stat of detailed_stats) {
                let thisRow = `<tr><td>${stat[1]}</td><td>${row[stat[0]]}</td></tr>`;
                table_str += thisRow;
            }
            let str_data = data.toString();
            str_data = str_data.replaceAll("{{name}}", row.name);
            str_data = str_data.replace("{{table_data}}", table_str);
            addPrevNext("gppd_idnr", "gppd_idnr", "powerplant", row.gppd_idnr, str_data, (str_data) => {
                res.status(200).type("html").send(str_data).end();
            });
        });
    });
});
app.get("/", (req, res) => {
    fs.readFile(path.join(templates_dir, "index.html"), (err, data) => {
        if (err) {
            res.status(500).type("html").send("<h1>500 server error</h1>").end();
            return;
        }
        let str_data = data.toString();

        db.all("SELECT DISTINCT COUNTRY,COUNTRY_LONG FROM powerplant ORDER BY COUNTRY_LONG", (err, rows) => {
            if (err) {
                res.status(500).type("html").send("<h1>500 sql error</h1>").send().end();
                return;
            }
            let list_str = "";
            for (let country of rows) {
                let thisRow = `<li>
                                        <a class="country-name" href="/country/${country.country}">${country.country_long}</a>
                                        <a href="/country/${country.country}">
                                            <img class="flag-img" src="/imgs/flags/${country.country}.svg" alt='Flag of ${country.country_long}'</a>
                                        </li>`;
                list_str += thisRow;
            }
            str_data = str_data.replace("{{country_list}}", list_str);
            db.all("SELECT primary_fuel, count(*) as c FROM powerplant GROUP BY primary_fuel ORDER BY primary_fuel desc", (err, rows) => {
                if (err) {
                    res.status(500).type("html").send("<h1>500 sql error</h1>").send().end();
                    return;
                }
                let list_str = "";
                for (let row of rows) {
                    let thisRow = `<li>
                                        <a href="/source/${row.primary_fuel}">${row.primary_fuel} (${row.c} plants)</a>
                                        </li>`;
                    list_str += thisRow;
                }
                str_data = str_data.replace("{{source_list}}", list_str);
                db.all("SELECT FLOOR(commissioning_year) cy, count(*) as c FROM powerplant GROUP BY FLOOR(commissioning_year) ORDER BY commissioning_year desc", (err, rows) => {
                    if (err) {
                        res.status(500).type("html").send("<h1>500 sql error</h1>").send().end();
                        return;
                    }
                    let list_str = "";
                    for (let row of rows) {
                        let thisRow = `<li>
                                        <a href="/year/${row.cy}">${row.cy == 0 ? "Unknown" : row.cy} (${row.c} plants)</a>
                                        </li>`;
                        list_str += thisRow;
                    }
                    str_data = str_data.replace("{{year_list}}", list_str);
                    res.status(200).type("html").send(str_data).end();
                });
            });
        });
    });
});
app.listen(port, () => {
    console.log("Started on " + port);
});