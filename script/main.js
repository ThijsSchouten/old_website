"use strict";

// File locations:
var file_loc = "data/ALL.json"
var weather_loc = "data/schiphol_weatherdata.csv"

var HEAT_SELECTION = [];

// ------------------ Main function on onload.

window.onload = function() {    
    // Populate the dropdown menus
    pop_regatta_dropdown("heat_graph_regatta", POP_DICTIONARY)
    pop_regatta_dropdown("laneadv_graph_regatta", POP_DICTIONARY)
    pop_heat_dropdown("heat_graph_field", "NSRF 2014", POP_DICTIONARY)
    pop_regatta_dropdown("regatta_graph_regatta", POP_DICTIONARY)

    // Set event listeners for tooltip and graph selectors
    document.addEventListener("mousemove", get_mouse);

    // Listeners for Heat Comparison menu & button
    document.getElementById("heat_graph_regatta")
        .addEventListener("change", update_heat_dropdown)
    document.getElementById("heat_graph_add")
        .addEventListener("click", update_heat_graph)
    document.getElementById("heat_graph_reset")
        .addEventListener("click", reset_heat_selection)
    document.getElementById("heat_graph_reset")
        .addEventListener("click", update_heat_graph)

    // Listeners for Regatta Scores and LaneAdvantage menus 
    document.getElementById("regatta_graph_selector")
        .addEventListener("change", update_regatta_graph);
    document.getElementById("laneadv_graph_selector")
        .addEventListener("change", update_laneadv_graph);

    // Draw the graphs
    update_heat_graph();
    update_regatta_graph();
    update_laneadv_graph();

    //Init google maps map. Credits dev.google
    google.maps.event.addDomListener(window, 'load', map_init("map"));
}

// ------------------ Functions to update dropdown menus / graphs.

function update_heat_dropdown() {
    document.getElementById("heat_graph_field").innerHTML = ""
    pop_heat_dropdown("heat_graph_field", document.getElementById("heat_graph_regatta").value, POP_DICTIONARY)
}

function update_laneadv_graph() {
    document.getElementById("laneadv").innerHTML = ""
    document.getElementById("laneadvinfo").innerHTML = ""
    var regatta = document.getElementById("laneadv_graph_regatta").value

    draw_rosetemp(regatta_date(regatta, 0), "#laneadvinfo", weather_loc)
    draw_rosetemp(regatta_date(regatta, 1), "#laneadvinfo", weather_loc)
    laneadv_graph(file_loc, "#laneadv", regatta)
}

function update_regatta_graph() {
    document.getElementById("regatta_overview").innerHTML = ""
    var regatta = document.getElementById("regatta_graph_regatta").value
    regatta_graph(file_loc, "#regatta_overview", regatta)
}

function update_heat_graph() {
    document.getElementById("heat_graph").innerHTML = ""
    var regatta = document.getElementById("heat_graph_regatta").value
    var field = document.getElementById("heat_graph_field").value

    HEAT_SELECTION.push([regatta, field])
    if (HEAT_SELECTION.length > 3) {
        HEAT_SELECTION.shift()
    }

    heat_graph(file_loc, "#heat_graph", HEAT_SELECTION)
}

// ------------------ Graph drawing functions 

function heat_graph(json_file_loc, element, fieldlist) {
    /*
     Draw a barchart for every list in fieldlist
     @json_file_loc: json input file location
     @element: the element to draw svg in
     @fieldlist: list of lists, containing [regatta, field] to draw
    */
    d3.json(json_file_loc, function(error, json) {
        if (error) return console.warn("error loading json");

        // Calculate domain to match all graphs
        var ydomain = [],
            all = [];

        for (var iter in fieldlist) {

            var regatta = fieldlist[iter][0],
                field = fieldlist[iter][1];

            // for every field, save the index 
            var heat_num = []

            for (var i in json.heats) {
                if (json.heats[i]._regtitle === regatta && json.heats[i]._id === field) {
                    heat_num.push(i)
                }
            }

            // go to this index and save the data
            for (var i in heat_num) {
                var status = json.heats[(heat_num[i])]._status
                if (status === "Final"){
                    for (var j in json.heats[(heat_num[i])]._teams) {
                        all.push(parseInt(json.heats[(heat_num[i])]._teams[j]._2000m[0]));
                    }
                }
            }
        }

        ydomain = [d3.min(all, function(d,i) { return all[i]}) - 10,
                      d3.max(all, function(d,i) { return all[i]}) + 10]

        // Plot every graph, leave out text and Y axis on every graph after first
        for (var iter in fieldlist) {

            var dataset = [],
                heat_num = [],
                regatta = fieldlist[iter][0],
                field = fieldlist[iter][1];
            
            // for every field, save the index 
            for (var i in json.heats) {
                if (json.heats[i]._regtitle === regatta && json.heats[i]._id === field) {
                    heat_num.push(i)
                }
            }

            // go to this index and save the data
            for (var i in heat_num) {
                var status = json.heats[(heat_num[i])]._status
                if (status === "Final"){
                    for (var j in json.heats[(heat_num[i])]._teams) {

                        var one = parseInt(json.heats[(heat_num[i])]._teams[j]._2000m[0]),
                            two = json.heats[(heat_num[i])]._teams[j]._uniqueID,
                            three = json.heats[(heat_num[i])]._teams[j]._people,
                            four = json.heats[(heat_num[i])]._teams[j]._code,
                            five = json.heats[(heat_num[i])]._teams[j]._lane;

                        dataset.push({times: one, uID: two, people: three,
                                      crew: four, status: status, lane: five})                    
                    }
                }
            }

            // Set up vars for D3 
            var margin = {top: 45, right: 10, bottom: 40, left: 50},
            width = 225 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

            var x = d3.scale.ordinal()
                .rangeBands([0, width], 0.1)
                .domain([0,1,2,3,4,5,6,7])

            var y = d3.scale.linear()
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .ticks(5)
                .tickFormat(function(d,i) {return formatMinutes(d)});

            // Select element to place svg in
            var svg = d3.select(element)
                .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                .append("g")
                    .attr("transform", "translate(" + margin.left + "," +
                          margin.top + ")");

            // Set y domain 
            y.domain(ydomain)

            // Add x-axis 
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
              .append("text")
                .attr("x", width)
                .attr("dy", "+2.7em")
                .style("text-anchor", "end")
                .text(function() {if (iter < 1) { return "Lane"}}); 

            // Add the y-axis on first viz, skip for others
            if (iter < 1) {
                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                  .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 10)
                    .attr("dy", ".71em")
                    .style("text-anchor", "end")
                    .text("Finish time");
            }

            // Add title text
            svg.append("text")
                .attr("class", "g_title")
                .attr("x", (width / 2))             
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .text(regatta+" "+field)

            var tip = d3.select("#tooltip") 

            // Add the bars
            svg.selectAll(".bar")
                .data(dataset)
              .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d,i) {return x(dataset[i].lane); })
                .attr("width", (x.rangeBand()))
                .attr("y", function(d,i) {return y(dataset[i].times); })
                .attr("height", function(d,i) {return height - y(dataset[i].times); })
                .on("mouseover", function(d,i) { 
                    var people = d.people.join("<br>")
                    tip.transition()        
                        .duration(100)      
                        .style("opacity", 1)
                        .style("background", "rgba(0,0,0,0.8)");      
                    tip.html("Time: " + formatMinutes(d.times)+"<hr>" + people)     
                    }) 
                .on("mouseout", function(d) {     
                        tip.transition()        
                            .duration(500)      
                            .style("opacity", 0);   
                    });

            // Add crew names to top of bar
            svg.selectAll("crew_code")
                .data(dataset)
              .enter().append("text")
                .attr("class", "crew_code")
                .attr("x", function(d,i) {return x(dataset[i].lane) + 9; })             
                .attr("y", function(d,i) {return y(dataset[i].times) - 2; })
                .attr("text-anchor", "middle")
                .text( function(d,i) {return dataset[i].crew })
        }
    });
}

function regatta_graph(json_file_loc, element, regatta) {
    /*
     Draws a chart for every days of a regatta. Calculates
     speed based on 2000m times and compares speed to quickest
     times in list.
     @json_file_loc: json input file location
     @element: the element to draw svg in
     @regatta: the regatta to visualize
    */

    // Set up size of the graph 
    var margin = {top: 45, right: 60, bottom: 60, left: 35},
        width = 700 - margin.left - margin.right,
        height = 330 - margin.top - margin.bottom;

    var dotwidth = 3

    // Ordinal scale on x-axis, linear on y-axis
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    // x- axis will but put at the bottom, y at top. Y ticks in percentages
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickFormat(d3.format(".0%"));

    // select tooltip div
    var tip = d3.select("#tooltip")

    // call the JSON file
    d3.json(json_file_loc, function(error, json) {
        if (error) return console.warn("error loading json");
        
        // variables to store the saturday and sunday heats
        var dataset_sat = [],
            dataset_sun = [],
            stats_sat = [],
            stats_sun = [],
            avg_sat = [],
            avg_sun = [],
            avg_all = [];

        // for every field in the json
        for (var i in json.heats) {

            // find heat containing the finale data
            if (json.heats[i]._status === "Final" &&
                json.heats[i]._regtitle === regatta ) 
            {
                // find the day of the race. 
                var day = (json.heats[i]._day)

                // for every team in the race
                for (var j in json.heats[i]._teams) {

                    // save the stats
                    var heat_id = json.heats[i]._id,
                        crew_code = json.heats[i]._teams[j]._code,
                        crew_time = json.heats[i]._teams[j]._2000m[0],
                        crew_percent = speed_percentage(crew_time, heat_id),
                        crew_names = json.heats[i]._teams[j]._people;

                    var heat_dict = {final_id: heat_id, code: crew_code,
                                     finish_time: crew_time, percent:
                                     crew_percent, names: crew_names}

                    // push to the matching day
                    if (day.indexOf("Sun") != -1) {
                        dataset_sun.push(heat_dict)
                    } else {
                        dataset_sat.push(heat_dict)
                    }
                }              
            }
        }    

        // saving quickest/slowest times of every heat
        for (var i in json.heats) {

            // find heat containing the finale data
            if (json.heats[i]._status === "Final" &&
                json.heats[i]._regtitle === regatta ) 
            {
                // find the day of the race. 
                var day = (json.heats[i]._day),
                    crew_times = [],
                    heat_id = json.heats[i]._id;

                // get every time
                for (var j in json.heats[i]._teams) {
                    // save the stats
                    crew_times.push(json.heats[i]._teams[j]._2000m[0]);
                }

                var max = Math.max.apply(Math, crew_times), 
                    min = Math.min.apply(Math, crew_times);

                var heat_dict = {final_id: heat_id, max: max, min: min}

                // push to the matching day
                if (day.indexOf("Sun") != -1) {
                    stats_sun.push(heat_dict)
                } else {
                    stats_sat.push(heat_dict)
                }              
            }
        }

        // calculate averages for stats
        for (var i in dataset_sat) {
            avg_sat.push(dataset_sat[i].percent)
            avg_all.push(dataset_sat[i].percent)
        }

        for (var i in dataset_sun) {
            avg_sun.push(dataset_sun[i].percent)
            avg_all.push(dataset_sun[i].percent)
        }

        var min_of_array = Math.min.apply(Math, avg_all) - 0.05;        

        avg_all = calc_avg(avg_all)
        avg_sat = [{percentage: calc_avg(avg_sat)}, {percentage: avg_all}]
        avg_sun = [{percentage: calc_avg(avg_sun)}, {percentage: avg_all}]
       
        r_overview(dataset_sat, stats_sat, avg_sat, "Saturday")
        r_overview(dataset_sun, stats_sun, avg_sun, "Sunday")

        function r_overview(dataset, dataset_bars, averages, dayname) {

            // Select the element to place svg in, add svg to it
            var svg = d3.select(element)
              .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            x.domain(dataset.map(function(d,i) {return dataset[i].final_id} ))
            y.domain([min_of_array,1])

            var extra_offset = (3*width)/dataset.length

            svg.append("text")
                .attr("class", "g_title")
                .attr("x", 30)             
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .text(dayname)

            svg.append("text")
                .attr("class", "g_title")
                .attr("x", width+17)             
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .text("AVG ▼")
 
            // x axis text
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .selectAll("text")  
                .style("text-anchor", "end")
                .attr("dx", "-.6em")
                .attr("dy", ".10em")
                // credits: http://www.d3noob.org/2013/01/how-to-rotate-text-labels-for-x-axis-of.html
                .attr("transform", function(d) { return "rotate(-60)" })
                .append("text")
                    .attr("x", width)
                    .attr("dy", "-0.71em")
                    .style("text-anchor", "end")
                    .text("HEAT ID"); 

            // y axis text
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
              .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 10)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("SPEED");

            // draw stat lines
            svg.selectAll("stat_overview")
                .data(averages)
              .enter().append("line")
                .attr("class", "stat_overview")
                .attr("x1", 0)
                .attr("y1", function(d) {return y(d.percentage)})
                .attr("x2", width)
                .attr("y2", function(d) {return y(d.percentage)})

            svg.selectAll("g_stat")
                .data(averages)
              .enter().append("text")
                .attr("class", "g_stat")
                .attr("transform", function(d) {return ("translate(" + (width+3) 
                                                + "," + y(d.percentage) + ")") })
                .attr("dy", ".35em")
                .attr("text-anchor", "start")
                .text(function(d,i) {return ["Day", "\u00A0\u00A0\u00A0\u00A0"+
                                                    "\u00A0\u00A0\u00A0\u00A0"+
                                                    "Regatta"][i%2]});

            // draw lines around dots
            svg.selectAll("heat_path")
                .data(dataset_bars)
              .enter().append("line")
                .attr("class", "path_overview")
                .attr("x1", function(d,i) {return x(dataset_bars[i].final_id) +
                                                            extra_offset })
                .attr("y1", function(d,i) {return y(speed_percentage(
                                                    dataset_bars[i].max,
                                                    dataset_bars[i].final_id))} )
                .attr("x2", function(d,i) {return x(dataset_bars[i].final_id) + 
                                                            extra_offset })
                .attr("y2", function(d,i) {return y(speed_percentage(
                                                    dataset_bars[i].min,
                                                    dataset_bars[i].final_id))} )
                .on("mouseover", function(d,i) { 

                    var id = dataset_bars[i].final_id;

                    tip.transition()        
                        .duration(100)      
                        .style("opacity", 1)
                        .style("background", "rgba(0,0,0,0.8)");   
                    tip.html("<strong>" + id + "</strong>")
                    })                  
                .on("mouseout", function(d) {       
                    tip.transition()        
                        .duration(500)      
                        .style("opacity", 0);
                    })   
    

            // draw the dots for every team
            svg.selectAll("dot_")
                .data(dataset)
              .enter().append("circle")
                .attr("class", "dot_overview")
                .attr("cx", function(d,i) { return x(dataset[i].final_id) + extra_offset })
                .attr("cy", function(d,i) { return y(dataset[i].percent) } )
                .attr("r", dotwidth)
                .on("mouseover", function(d,i) { 

                    var id = dataset[i].final_id,
                        code = dataset[i].code,
                        names = dataset[i].names.join("<br>");

                    tip.transition()        
                        .duration(100)      
                        .style("opacity", 1)
                        .style("background", "rgba(0,0,0,0.8)");   
                    tip.html("<strong>" + id + "&nbsp&nbsp|&nbsp&nbsp" +
                                 code + "</strong><hr>" + names)
                    })                  
                .on("mouseout", function(d) {       
                    tip.transition()        
                        .duration(500)      
                        .style("opacity", 0);   
                });


        }
            
    });
}

function laneadv_graph(json_file_loc, element, regatta) {

    // Set up size of the graph 
    var margin = {top: 20, right: 40, bottom: 60, left: 55},
        width = 240 - margin.left - margin.right,
        height = 1400 - margin.top - margin.bottom;

    // Ordinal scale on x-axis, linear on y-axis
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width]);

    var y = d3.time.scale()
        .range([height, 0]);

    // x- axis will but put at the bottom, y at top. Y ticks in percentages
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickSize(0)

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(d3.time.minute, 60)
        .tickFormat(d3.time.format("%I %p"));

    var tip = d3.select("#tooltip")

    // Call the JSON file
    d3.json(json_file_loc, function(error, json) {
        if (error) return console.warn("error loading json");

        var dataset_sat = [],
            dataset_sun = [];
        
        // For every field, save the index 
        for (var i in json.heats) {
            if (json.heats[i]._regtitle === regatta) {

                // Save every team data needed for the graph and tooltip
                for (var j in json.heats[i]._teams) {
                    var crew = {_2000m: json.heats[i]._teams[j]._2000m[0],  
                                      _lane: json.heats[i]._teams[j]._lane, 
                                      _finish: json.heats[i]._teams[j]._finish,
                                      _people: json.heats[i]._teams[j]._people,
                                      _day: json.heats[i]._day,
                                      _id: json.heats[i]._id,
                                      _team: json.heats[i]._teams[j]._code,
                                      _status: json.heats[i]._status,
                                      _time: json.heats[i]._time}
                    if (crew._day === "Sun") {
                        dataset_sun.push(crew)
                    } if (crew._day === "Sat") {
                        dataset_sat.push(crew)
                    }
                }
                
            }    
        }

        plot_dataset(dataset_sat),
        plot_dataset(dataset_sun)

        function plot_dataset(dataset) {

            var svg = d3.select(element)
                  .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                  .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var defs = svg.append('svg:defs');

            var mindate = new Date(0,0,0, 8, 0, 0, 0),
                maxdate = new Date(0,0,0, 19, 0, 0, 0);

            var lanes = [0,1,2,3,4,5,6,7]

            x.domain(lanes)
            y.domain([maxdate, mindate])

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
              .append("text")
                .attr("x", width)
                .attr("dy", "+2.7em")
                .style("text-anchor", "end")
                .text("Lane"); 

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
              .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 10)
                .attr("dy", ".21em")
                .style("text-anchor", "end")
                .text("Start Time");

            // Grey-white background on lanes
            svg.selectAll("rect_laneadv")
                .data([0,1,2,3,4,5,6,7])                
              .enter().append("rect")
                .attr("class", "rect_laneadv")
                .attr("x", x.rangeRoundBands([0, width]))
                .attr("y",0)
                .attr("width", 18)
                .attr("height", height)
                .style("fill", function(d,i) {return ["rgba(0,0,0,0)", "#f8f8f8"][i%2]})
                .on("mouseover", function(d,i) { 
                    var lane = lanes[i]
                    tip.transition()        
                        .duration(400)      
                        .style("opacity", 1)
                        .style("background", "rgba(0,0,0,0.8)");   
                    tip.html("Lane " + lane)
                    })                  
                .on("mouseout", function(d) {       
                    tip.transition()        
                        .duration(500)      
                        .style("opacity", 0);   
                });



            svg.selectAll("dot_laneadv")
                .data(dataset)
              .enter().append("circle")
                .attr("class", function(d,i) { if (dataset[i]._status === "Final") {
                                                return "dot_final";} return "dot_heat"})
                .attr("cx", function(d,i) { return x(dataset[i]._lane) + 9} )
                .attr("cy", function(d,i) { return y(minuteNumber(d._time))})
                .attr("r", function(d,i) { return 8-(dataset[i]._finish)})
                
                .on("mouseover", function(d,i) { 
                    var lane = dataset[i]._lane,
                        crew = dataset[i]._team,
                        team = dataset[i]._team,
                        finish = dataset[i]._finish,
                        time = dataset[i]._time;

                    tip.transition()        
                        .duration(100)      
                        .style("opacity", 1)
                        .style("background", "rgba(0,0,0,0.8)");   
                    tip.html(crew + "&nbsp&nbsp|&nbsp&nbsp" + time + "<hr>finished ["
                             + finish  + "]<br>" +
                            " in lane ["+lane+"]")
                    })                  
                .on("mouseout", function(d) {       
                    tip.transition()        
                        .duration(500)      
                        .style("opacity", 0);   
                });
        }
        
    });
}

function draw_rosetemp(date, element, weather_loc) {
    /*
     Draws a windrose rotated to that days winddirection
     Adds the avg windspeed as well.
     @date: date of race
     @element: element to draw svg in
     @weather_loc: location of csv
    */

    // Set up size of the graph 
    var margin = {top: 20, right: 40, bottom: 60, left: 55},
        width = 240 - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;

    // Read the csv file
    d3.csv(weather_loc, function(data) {

        // Select element, append svg
        var svg = d3.select(element)
                  .append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)

        // Save weather data to list
        var weather = []
        for (var i in data) {
            if (data[i].Datum === date) {
                weather.push({wind_direct: data[i].Wind_direct,
                           wind_speed: data[i].Wind_speed,
                           max_temp: data[i].Max_temp})
            }
        }

        // Add the date as a title
        svg.append("text")
            .attr("class", "g_title")
            .attr("x", (width/2+margin.left))             
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text(date)

        // Set x,y to position relative to
        var start = {x: 120, y: 75}

        // Add the North symbol to rose
        svg.append("text")
            .attr("class", "g_rose")
            .attr("x", start.x)             
            .attr("y", start.y-21)
            .attr("text-anchor", "middle")
            .text("N")

        // Add "DAY AVG" text
        svg.append("text")
            .attr("class", "g_rose")
            .attr("x", 11)             
            .attr("y", start.y)
            .attr("text-anchor", "left")
            .text("DAY AVG: ")

        // Format the wind speed and add
        svg.append("text")
            .attr("class", "g_rose")
            .attr("x", start.x+30)             
            .attr("y", start.y)
            .attr("text-anchor", "left")
            .text(weather[0].wind_speed/10 + " m/s")

        // Draw the windrose's circle
        svg.selectAll("circle_rose")
            .data(weather)
          .enter().append("circle")
            .attr("class", "circle_rose")
            .attr("cx", start.x)
            .attr("cy", start.y)
            .attr("r", 19)
            .style("fill", "none")
            .style("stroke", "black")
            .style("stroke-width", "1")

        // Draw rose's arrow
        svg.selectAll("polygon_rose")
            .data(weather)
          .enter().append("polygon")
            .attr("class", "polygon_rose")
            .attr("points", function(d,i) {
                return ((start.x-2)+","+(start.y-4)+" "+
                       (start.x-8)+","+(start.y-4)+" "+
                       (start.x)+","+(start.y-16)+" "+
                       (start.x+8)+","+(start.y-4)+" "+
                       (start.x+2)+","+(start.y-4)+" "+
                       (start.x+2)+","+(start.y+16)+" "+
                       (start.x-2)+","+(start.y+16))
            })
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("transform", "rotate("+weather[0].wind_direct+
                  ","+start.x+","+start.y+")")
    });
} 

// ------------------ Utility functions

function pop_regatta_dropdown(element, dictionary) {
    /*
     Populates the dropdown menu for regattas
     @element: elment dropdown menu is in
     @dictionary: dictionary with key being a regatta
    */
    var dropdown = document.getElementById(element)

    // get dict keys, store in list
    for (var key in dictionary) {
        var option = document.createElement("option")
        option.text=key
        option.value=key
        dropdown.add(option)
    }
}

function pop_heat_dropdown(element, regatta, dictionary) {
    /*
     Populates the dropdown menu for heats
     @element: elment dropdown menu is in
     @regatta: the name of the regatta to get heats from
     @dictionary: dictionary key:value with key regatta, value heat
    */
    var dropdown = document.getElementById(element)

    for (var heat in dictionary[regatta]) {
        var option = document.createElement("option")
        option.text=dictionary[regatta][heat]
        option.value=dictionary[regatta][heat]
        dropdown.add(option)
    }
}

function formatMinutes(d) {
    /*
     Pretty printing h/m/s from s
     Inspired/Credits jshanley on stackoverflow. 
     @d: integer representing seconds
     @returns: pretty printed string in h/m/s
    */   
    var hours = Math.floor(d / 3600),
        minutes = Math.floor((d - (hours * 3600)) / 60),
        seconds = d - (minutes * 60);

    var output = seconds + 's';
    if (minutes) {
        output = minutes + "m" + output;
    }
    if (hours) {
        output = hours + 'h ' + output;
    }
    return output;
}

function get_mouse(event) {
    /*
     Updates tooltip div to mouse screen coords.
    */
    var offset = $("body").offset();
    var posY = offset.top - $(window).scrollTop() 
    var posX = offset.left - $(window).scrollLeft()

    var x = event.clientX - posX + 10
    var y = event.clientY - posY + 10

    var tip = d3.select("#tooltip")
    tip.style("left", x + "px")     
   .style("top", y + "px"); 
}

function minuteNumber(time_string) {
    /*
     Takes a time string like "11:45" and returns datefile
     @time_string: input string formatted as mm:ss
     @returns: datefile 
    */
    var hour = time_string.split(":")[0]
    var minute = time_string.split(":")[1]
    var date = new Date(0,0,0, hour, minute, 0, 0)

    return date
}

function map_init(element) {
    /*
     Draws a Google Maps
     Style Credits: Tanja Lederer on https://snazzymaps.com/
     Code examples from: https://developers.google.com/maps/
     @element: the element to draw the map in
    */

    var map;
    var maptype_name = 'custom_style';
    var canvas = document.getElementById(element)

    var custom_style = [
        {
            "featureType": "landscape",
            "stylers": [
                {
                    "hue": "#FFA800"
                },
                {
                    "saturation": 0
                },
                {
                    "lightness": 0
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "featureType": "road.highway",
            "stylers": [
                {
                    "hue": "#53FF00"
                },
                {
                    "saturation": -73
                },
                {
                    "lightness": 40
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "stylers": [
                {
                    "hue": "#FBFF00"
                },
                {
                    "saturation": 0
                },
                {
                    "lightness": 0
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "featureType": "road.local",
            "stylers": [
                {
                    "hue": "#00FFFD"
                },
                {
                    "saturation": 0
                },
                {
                    "lightness": 30
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "featureType": "water",
            "stylers": [
                {
                    "hue": "#00BFFF"
                },
                {
                    "saturation": 6
                },
                {
                    "lightness": 8
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "featureType": "poi",
            "stylers": [
                {
                    "hue": "#679714"
                },
                {
                    "saturation": 33.4
                },
                {
                    "lightness": -25.4
                },
                {
                    "gamma": 1
                }
            ]
        }
    ]

    var mapOptions = {
        center: new google.maps.LatLng(52.326370, 4.837715),
        zoom: 14,
        disableDefaultUI: true,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, maptype_name]
        },
        mapTypeId: maptype_name
    }

    map = new google.maps.Map(canvas, mapOptions);

    var styledMapOptions = {
        name: 'Custom Style'
    };

    var customMapType = new google.maps.StyledMapType(custom_style, styledMapOptions)

    map.mapTypes.set(maptype_name, customMapType);
}

function calc_avg(int_array) {
    /*
     Calculates average of int array
     @int_array: array of integers
     @returns: number representing the avg 
    */
    var total = 0
    var length = int_array.length

    for (var i in int_array) {
        total = total + int_array[i]
    }

    return total/length
}

function regatta_date(regatta, i) {
    /*
     Searches for the regatta day in a dict.
     @regatta: the regatta to get date from
     @i regatta day. First day: 0, Second day, 1.
     @returns: date of the regatta.
    */
    var dates = {"NSRF 2014":["2014-07-05","2014-07-06"],
                 "NSRF 2013":[""],
                 "NSRF 2012":[""],
                 "HOLLANDIA 2014":["2014-05-24","2014-05-25"],
                 "HOLLANDIA 2013":["2013-04-20","2013-04-21"],
                 "HOLLANDIA 2012":["2012-04-21","2012-04-22"]
                 }
    return dates[regatta][i]
}

function reset_heat_selection() {
    /*
     Reset the heats selected
    */
    if (HEAT_SELECTION.length > 0){
        HEAT_SELECTION = []
    }
}

function speed_percentage(time, field_id) {
    /*
     Takes the quickest time from QUICKEST_TIMES[boattype]
     Calculates speed from this time (based on 2000m)
     Returns a races score in % vs the highscore
    */
    var best = 1 / QUICKEST_TIMES[field_id],
        current = 1 / time,
        percentage = (current / best)

    if (isNaN(percentage) === true) {
        console.log(field_id, "error, no time or no best_time found")
        return 0.5
    }

    return percentage
}

// ------------------ Others
  
/*   Pre-calculated data. Could be done real-time as well but:
     would make the browser really slow. */

var POP_DICTIONARY =({'NSRF 2014':["SA2+", "SA2-", "SA2x", "SA4-", "SA4x", "SA8+", "O1x", "O2-", "O4+", "O4-", "N1x", "N2+", "N2-", "N2x", "N4+", "N4-", "B1x", "B4+", "B8+", "LSA1x", "LSA2+", "LSA2-", "LSA4-", "LSA8+", "LO1x", "LO2-", "LO4+", "LO4-", "LN1x", "LN2+", "LN2-", "LN2x", "LN4+", "LN4-", "LB1x", "LB8+", "DSA1x", "DSA2+", "DSA2-", "DSA2x", "DSA4-", "DSA4x", "DSA8+", "DO1x", "DO2-", "DO4+", "DN1x", "DN2-", "DN2x", "DN4+", "DN4-", "DB1x", "DB4+", "DB8+", "LDSA1x", "LDO1x", "LDN1x", "LDN2x", "LDB1x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDEj4x", "LDDev2x", "SA1x"], 'ARB 2014':["SA1x", "SA2-", "SA2x", "SA4-", "SA8+", "O1x", "O2-", "O4+", "O4-", "N1x", "N2-", "N4+", "N4-", "B1x", "B8+", "LSA1x", "LSA2-", "LSA2x", "LSA8+", "LO1x", "LO2-", "LO4-", "LN1x", "LN2-", "LN4+", "LN4-", "LB1x", "LB4+", "LB8+", "DSA1x", "DSA2-", "DSA2x", "DSA8+", "DO1x", "DO2-", "DO4-", "DN1x", "DN2-", "DN4+", "DN4-", "DB1x", "DB4+", "DB8+", "LDSA1x", "LDSA2x", "LDO1x", "LDN1x", "LDN2x", "LDB1x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDEj2x", "LDEj4x", "LDDev2x"],'HOLLANDIA 2014':["SA1x", "SA2-", "SA2x", "SA4-", "SA8+", "O2-", "O4+", "O4-", "N1x", "N2-", "N2x", "N4+", "N4-", "B1x", "B4+", "B8+", "LSA1x", "LSA8+", "LO2-", "LO4-", "LN1x", "LN2-", "LN2x", "LN4+", "LN4-", "LB1x", "LB4+", "LB8+", "DSA1x", "DSA2-", "DSA2x", "DSA4-", "DSA4x", "DSA8+", "DO2-", "DN1x", "DN2-", "DN2x", "DN4+", "DN4-", "DB1x", "DB4+", "DB8+", "LDSA1x", "LDN1x", "LDN2x", "LDB1x", "O1x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDEj2x", "LDEj4x", "LDDev2x"],  'NSRF 2013':["SA1x", "SA2+", "SA2-", "SA2x", "SA4-", "SA4x", "SA8+", "O1x", "O2-", "O4+", "O4-", "N1x", "N2+", "N2-", "N2x", "N4+", "N4-", "B1x", "B4+", "B8+", "LSA1x", "LSA2+", "LSA2-", "LSA2x", "LSA8+", "LO1x", "LO2-", "LO4+", "LO4-", "LN1x", "LN2+", "LN2-", "LN2x", "LN4+", "LN4-", "LB1x", "LB4+", "LB8+", "DSA1x", "DSA2+", "DSA2-", "DSA2x", "DSA4x", "DSA8+", "DO1x", "DO2-", "DO4+", "DO4-", "DN1x", "DN2-", "DN2x", "DN4+", "DN4-", "DB1x", "DB4+", "DB8+", "LDSA1x", "LDO1x", "LDN1x", "LDN2x", "LDB1x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDEj4x", "LDDev2x"], 'ARB 2013':["SA1x", "SA2-", "SA2x", "SA4-", "SA8+", "O1x", "O2-", "O4+", "O4-", "N1x", "N2-", "N4+", "N4-", "B1x", "B4+", "B8+", "LSA1x", "LSA2-", "LSA8+", "LO1x", "LO2-", "LN1x", "LN2-", "LN4+", "LN4-", "LB1x", "LB4+", "LB8+", "DSA1x", "DSA2-", "DSA2x", "DSA4-", "DSA8+", "DO1x", "DO2-", "DO4-", "DN1x", "DN2-", "DN4+", "DN4-", "DB1x", "DB4+", "DB8+", "LDSA1x", "LDO1x", "LDN1x", "LDB1x", "SB4+", "LSB4-", "SB2x", "SB4x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDEj4x", "LDDev2x"], 'HOLLANDIA 2013':["SA1x", "SA2-", "SA8+", "O2-", "O4-", "N1x", "N2-", "N4+", "N4-", "B1x", "B4+", "B8+", "LSA1x", "LSA2-", "LO1x", "LO2-", "LO4-", "LN1x", "LN2-", "LN4+", "LN4-", "LB1x", "LB4+", "LB8+", "DSA1x", "DSA2-", "DSA8+", "DO2-", "DO4+", "DN1x", "DN2-", "DN4+", "DN4-", "DB1x", "DB8+", "LDSA1x", "LDN1x", "LDN2x", "LDB1x", "Ej8+", "Dev4-", "LEj8+", "LDev4-", "DEj8+", "DDev4-", "LDDev2x"]})
var QUICKEST_TIMES = ({'SA2+':438.49, 'SA2-':387.67, SA2x:394.23, 'SA4-':359.74, SA4x:352.94, 'SA8+':337.15, O1x:430.38, 'O2-':408.48, 'O4+':401.3, 'O4-':377.72, N1x:428.39, 'N2+':457.37, 'N2-':411.07, N2x:404.57, 'N4+':399.55, 'N4-':380.18, B1x:434.36, 'B4+':403.83, 'B8+':354.85, LSA1x:422.78, 'LSA2+':455.9, 'LSA2-':417.35, 'LSA4-':365.97, 'LSA8+':360.06, LO1x:436.57, 'LO2-':408.01, 'LO4+':420.12, 'LO4-':369.35, LN1x:427.08, 'LN2+':466.16, 'LN2-':426.34, LN2x:414.08, 'LN4+':413.43, 'LN4-':388.73, LB1x:453.77, 'LB8+':369.83, DSA1x:458.46, 'DSA2+':511.52, 'DSA2-':437.64, DSA2x:419.27, 'DSA4-':397.34, DSA4x:379.12, 'DSA8+':373.17, DO1x:479.86, 'DO2-':450.59, 'DO4+':442.69, DN1x:474.07, 'DN2-':454.71, DN2x:464, 'DN4+':450.32, 'DN4-':428.75, DB1x:489.4, 'DB4+':464.6, 'DB8+':395.65, LDSA1x:463.29, LDO1x:498.32, LDN1x:492.68, LDN2x:466.73, LDB1x:511.58, 'Ej8+':350.81, 'Dev4-':373.21, 'LEj8+':361.28, 'LDev4-':377.73, 'DEj8+':391.15, 'DDev4-':412.43, LDEj4x:443.73, LDDev2x:451.36, SA1x:413.14, LSA2x:427.77, 'LB4+':413.7, 'DO4-':440.44, LDSA2x:480.78, LDEj2x:480.13, 'SB4+':447.21, 'LSB4-':365.97, SB2x:394.23, SB4x:352.94})

function get_json_list(json_file_loc) {
    /*
     Create a JSON object for console.log in firefox -
     Run only when JSON data is updated. - manually save in POP_DICTIONARY
     @json_file_loc: Location of the json file on disk
    */

    d3.json(json_file_loc, function(error, json) {
        if (error) return console.warn("error loading json");

        var json_dictionary = {}
        var regattas = []

        // get the different regattas from json and add regatta key
        for (var i in json.heats) {
            if (regattas.indexOf(json.heats[i]._regtitle) === -1) {
                regattas.push(json.heats[i]._regtitle)
                json_dictionary[json.heats[i]._regtitle] = []
            }
        }
        // create a list of fields in this regatta
        for (var i in json.heats) {
            if (json_dictionary[json.heats[i]._regtitle].indexOf(json.heats[i]._id) === -1) {
                json_dictionary[json.heats[i]._regtitle].push(json.heats[i]._id)
            }
        }

        console.log("If error: Try this in FireFox.. :) ")
        //console.log(json_dictionary.toSource())

        return json_dictionary
    });
}   

function get_quickest_times(json_file_loc) {
    /*
     Create a JSON object for console.log in firefox -
     Run only when JSON data is updated. - manually save in QUICKEST_TIMES
     @json_file_loc: Location of the json file on disk
    */

    var records = {}

    for (var i in json_file_loc) {

        d3.json(json_file_loc[i], function(error, json) {
            if (error) return console.warn("error loading json");

            // for every field
            for (var i in json.fields) {
                // save the heattype
                var heattype = json.fields[i].id

                for (var j in json.fields[i].participants) {
                    //console.log(json.fields[i].participants[j])
                    var time = json.fields[i].participants[j].twenty_time
                    if (records[heattype] === undefined) {
                        records[heattype] = time
                    } else if (time < records[heattype]) {
                        console.log("update", heattype)
                        records[heattype] = time
                    } else {
                        console.log("no new record")
                    }
                }
            } 

        console.log(records.toSource())

        // or return records
        });
    }
}