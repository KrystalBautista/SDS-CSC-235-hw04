const width = 600;
const height = 400;

const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height);

const barSvg = d3.select("#barChart")
    .attr("width", 500)
    .attr("height", 400);

const tooltip = d3.select("#tooltip");

const projection = d3.geoAlbersUsa()
    .scale(800)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);




d3.select("#map")
    .insert("text", ":first-child")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("US Homicide Rates by State (Filtered by Year)");


d3.select("#barChart")
    .insert("text", ":first-child")
    .attr("x", 250)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Weapon Distribution by State");


let crimeData = [];
let selectedState = null;
let selectedYear = null;
let activeData = [];
let stateCounts = new Map();


function getStateName(d) {
    return d.properties.NAME;
}

function normalize(s) {
    return (s || "").trim().toLowerCase();
}


Promise.all([
    d3.json("us-states.json"),
    d3.csv("US_Crime_DataSet_small.csv")
]).then(([geoData, data]) => {

    console.log("Geo loaded:", geoData);

    data.forEach(d => {
        d.Year = +d.Year;
        d.State = d.State.trim();
    });

    crimeData = data;
    activeData = crimeData;

    stateCounts = computeStateCounts(activeData);

    initDropdown(data);

    drawMap(geoData);
}).catch(err => {
    console.error("Data loading error:", err);
});


function initDropdown(data) {

    const years = [...new Set(data.map(d => d.Year))].sort();

    const dropdown = d3.select("#yearFilter");

    dropdown.selectAll("option.year")
        .data(years)
        .enter()
        .append("option")
        .attr("class", "year")
        .text(d => d)
        .attr("value", d => d);

    dropdown.on("change", function () {

        selectedYear = this.value ? +this.value : null;

        updateActiveData();
        updateMap();

        if (selectedState) {
            updateBarChart(selectedState);
        }
    });
}


function updateActiveData() {

    activeData = selectedYear
        ? crimeData.filter(d => d.Year === selectedYear)
        : crimeData;

    stateCounts = computeStateCounts(activeData);
}

function computeStateCounts(data) {

    return new Map(
        d3.rollup(data, v => v.length, d => d.State)
    );
}


function drawMap(geoData) {

    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => getColor(getStateName(d)))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)

        .on("click", (event, d) => {

            selectedState = getStateName(d);

            updateBarChart(selectedState);

            svg.selectAll("path")
                .attr("stroke", p =>
                    getStateName(p) === selectedState ? "black" : "#fff"
                )
                .attr("stroke-width", p =>
                    getStateName(p) === selectedState ? 2 : 0.5
                );
        })

        .on("mouseover", (event, d) => {

            const state = getStateName(d);
            const count = stateCounts.get(state) || 0;

            tooltip.style("opacity", 1)
                .html(`${state}<br>Crimes: ${count}`)
                .style("left", event.pageX + "px")
                .style("top", event.pageY + "px");
        })

        .on("mouseout", () => tooltip.style("opacity", 0));
}


function getColor(state) {

    const values = [...stateCounts.values()];
    const max = d3.max(values) || 1;
    const value = stateCounts.get(state) || 0;

    return d3.interpolateReds(value / max);
}

function updateMap() {

    svg.selectAll("path")
        .transition()
        .duration(500)
        .attr("fill", d => getColor(getStateName(d)));
}


function updateBarChart(state) {

    if (!state) return;

    const filtered = activeData.filter(d =>
        normalize(d.State) === normalize(state)
    );

    const weaponCounts = d3.rollup(
        filtered,
        v => v.length,
        d => d.Weapon
    );

    const data = Array.from(weaponCounts, ([weapon, count]) => ({
        weapon,
        count
    }));

    drawBarChart(data);
}

function drawBarChart(data) {

    barSvg.selectAll("*").remove();

    if (!data.length) return;

    const margin = { top: 20, right: 20, bottom: 70, left: 50 };
    const innerWidth = 500 - margin.left - margin.right;
    const innerHeight = 400 - margin.top - margin.bottom;

    const g = barSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.weapon))
        .range([0, innerWidth])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count) || 1])
        .nice()
        .range([innerHeight, 0]);

    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(y));

    

 
    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Weapon Type");


    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Incidents");

    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.weapon))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.count))
        .attr("fill", "steelblue");
}


d3.select("#resetBtn").on("click", () => {

    selectedState = null;
    selectedYear = null;

    d3.select("#yearFilter").property("value", "");

    updateActiveData();
    updateMap();

    barSvg.selectAll("*").remove();

    svg.selectAll("path")
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);
});