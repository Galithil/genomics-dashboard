/**
 * Calculates difference in days between two dates
 * @param {Date} date1	A Date object
 * @param {Date} date2	A Date object
 * @returns {Number} 	Difference in days between date2 and date1
 */
function daydiff(date1, date2) { 
        var day = 1000*60*60*24;
        var diff = Math.ceil((date2.getTime()-date1.getTime())/(day));
        return diff;				
}

/**
 * Generates a function to compute the interquartile range. Used by drawBoxPlot for whisker length determination 
 * @param {Number} k	whisker limit factor for boxplot
 * @returns {Function}    Function to compute interquartile range based on k. 
 */
function iqr(k) {
  return function(d) {
    var q1 = d.quartiles[0],
        q3 = d.quartiles[2],
        iqr = (q3 - q1) * k,
        i = -1,
        j = d.length;
    while (d[++i] < q1 - iqr);
    while (d[--j] > q3 + iqr);
    return [i, j];
  };
}


/**
 * Sorting function for runchart data sets
 * @param {Array} a	An array for a project: [ daydiff, num_samples, doneDate, project_id ]
 * @param {Array} b	An array for a project: [ daydiff, num_samples, doneDate, project_id ]
 * @returns {Number} 	negative values if a should be sorted before b, and positive values if vice versa
 */
function dateValueSort(a, b){
        var datediff = a[2] - b[2]; // Date done
        if (datediff == 0) {
            //return b[1] - a[1]; // longer del times sorted before shorter
            
            if (a[0] == b[0]) { // Delivery time
                if (a[3] < b[3]) { // Project ID, lower ID before higher
                    //console.log("a: " + a[3] + ", " + a[0] + ", " + a[2] + " / " + "b: " + b[3] + ", " + b[0] + ", " + b[2]);
                    return -1;
                } else {
                    //console.log("a: " + a[3] + ", " + a[0] + ", " + a[2] + " / " + "b: " + b[3] + ", " + b[0] + ", " + b[2]);
                    return 1;
                }
            }
            return b[0] - a[0]; // longer del times sorted before shorter
        } else {
            return datediff;
        }
}

/**
 * Sorting function for project data sets
 * @param {Object} a	A project object
 * @param {Array} b A project object
 * @returns {Number}	negative values if a should be sorted before b, and positive values if vice versa, otherwise 0
 */
function sortByQueueArrival (a, b) {
    var aV =  a["value"];
    var bV =  b["value"];
    var aQD = aV["Queue date"];
    var bQD = bV["Queue date"];
    var aAD = aV["Arrival date"];
    var bAD = bV["Arrival date"];
    var aPid = a["key"][0]; // project id
    var bPid = b["key"][0]; // project id
    //var aAppl = a["key"][2];
    //var bAppl = b["key"][2];
    if (aQD == "0000-00-00" && bQD == "0000-00-00") {
        return 0;
    }
    if(aQD < bQD) {
        if(aQD == "0000-00-00") {
            return 1;
        } // if no queue date yet => end of queue
        return -1;
    }
    if(aQD > bQD) {
        if(bQD == "0000-00-00") {
            return -1;
        } // if no queue date yet => end of queue
        return 1;
    }
    if(aAD < bAD) { return -1; }
    if(aAD > bAD) { return 1; }
    if(aPid < bPid) { return -1; }
    if(aPid > bPid) { return 1; }
    return 0;
    
}

// Look at calculating and adding a first in queue date. Is this the proper place to do this? On sample level instead?
/**
 * Reduces a json object at sample level from statusdb map-reduce view to project level
 * @param {Object} jsonview	json object of sample level data
 * @returns {Object} 	a reduced json object at project level, sorted on Queue date - Arrival date - proj ID
 */
function reduceToProject(jsonview) {
    var rows = jsonview["rows"];
    var projects = {};
    var prepStarts = {};
    
    // Loop through all samples
    for (var i = 0; i < rows.length; i++) {
        var keys = rows[i]["key"];
        var values = rows[i]["value"];
        var pid = keys[0]; // project id
        var type = keys[1]; // type = Production || Applications
        var appl = keys[2]; // application
        var pf = keys[3]; // platform
        var sid = keys[4]; // sample id
        if(projects[pid] == undefined) { // new project, initialize with keys
            projects[pid] = {
                                "type": type,
                                "appl": appl,
                                "pf": pf,
                            }
            for (var valKey in values) {
                projects[pid][valKey] = values[valKey]; // intialize all data for proj with values of first sample
            }
        } else {
            // update data with appropriat date, or sum up lanes or samples
            for (var valKey in values) {
                var currVal = values[valKey];
                if (valKey == "Lib prep start") { // capture prep start dates
                    if (prepStarts[currVal] == undefined) { // no data for this date, so initialize array
                        prepStarts[currVal] = [ ]; 
                    }
                    prepStarts[currVal].push( projects[pid]); // add project object   
                }
                if(valKey == "Samples" || valKey == "Lanes") {
                    projects[pid][valKey] += values[valKey];
                } else if (valKey.indexOf("start") != -1 ) { // get earliest start dates
                    if (currVal < projects[pid][valKey]) { projects[pid][valKey] = currVal; } // handles 0000-00-00 as well
                } else { // get latest done dates, except 0000-00-00
                    if (currVal == "0000-00-00" || projects[pid][valKey] == "0000-00-00") { // need to capture if date is already set to 0000-00-00
                        projects[pid][valKey] = "0000-00-00";
                    } else if (currVal > projects[pid][valKey]) {
                        projects[pid][valKey] = currVal;
                    }
                }
            }
        }
    }

    var outRows = [];
    
    // go through all projects and put in original structure
    for (var pid in projects) {
        var newKey = [
            pid,
            projects[pid]["type"],
            projects[pid]["appl"],
            projects[pid]["pf"]
        ];
        
        var newValue = {
            "Arrival date":projects[pid]["Arrival date"],
            "Rec Ctrl start":projects[pid]["Rec Ctrl start"],
            "Queue date":projects[pid]["Queue date"],
            "Lib prep start":projects[pid]["Lib prep start"],
            "QC library finished":projects[pid]["QC library finished"],
            "Sequencing start":projects[pid]["Sequencing start"],
            "All samples sequenced":projects[pid]["All samples sequenced"],
            "Close date":projects[pid]["Close date"],
            "Samples":projects[pid]["Samples"],
            "Lanes":parseFloat(Math.round(projects[pid]["Lanes"]).toFixed(2))
        };
        
        var newRow = {
            "key": newKey,
            "value": newValue
        }
        outRows.push(newRow);
    }
    
    // sort in queue order 
    outRows.sort(sortByQueueArrival);
    
    // get the prep start dates. Not used at the moment
    var prepStartsArr = [];
    for (var date in prepStarts) {
        if (date != "0000-00-00") {
            prepStartsArr.push(date);
        }
    }
    prepStartsArr.sort();
    
    return { "rows": outRows };
}


/**
 * Generates a dataset for runchart line plot over time from a couchdb view
 * @param {Object} jsonview		A parsed json stream
 * @param {Date} dateRangeStart	A Date object to specify start of date range to include
 * @param {Date} dateRangeEnd	A Date object to specify end of date range to include
 * @param {String} dateFromKey	A key to identify start date for diff calculation
 * @param {Boolean} onlyProduction	If true only include data where type == "Production"
 * @param {String} filter	A key to identify records to be selected
 * @param {Boolean} inverseSelection If true look for absence of filter string
 * @returns {Array} 			An array [ order, daydiff, num_samples, doneDate, project_id ]. Times are in days
 */
function generateRunchartDataset (jsonview, dateRangeStart, dateRangeEnd, dateFromKey, dateToKey, onlyProduction, filter, inverseSelection) {
        var dataArray = [];
        var rows = jsonview["rows"];
        var projects = {};
        
        // Each row is one project
        for (var i = 0; i < rows.length; i++) {
            //console.log("looping through json array: 1");
            var keys = rows[i]["key"];
            var values = rows[i]["value"];
            
            
            var pid = keys[0]; // project id
            var type = keys[1]; // type = Production || Applications
            var appl = keys[2]; // application
            var pf = keys[3]; // platform
            //var sid = keys[4]; // sample id
            if(onlyProduction && type != "Production") { continue; }
            
            
            if(filter) {
                var filter_field;
                if(filter.indexOf("library") != -1) {
                    filter_field = 2; // index for application in keys array
                } else if(filter.indexOf("iSeq") != -1) {
                    filter_field = 3; // index for platform in keys array
                }
                
                // more here... ?
                
                if(!inverseSelection) {
                    if(keys[filter_field] != null && keys[filter_field].indexOf(filter) == -1 ) { continue; }                     
                } else {
                    if(keys[filter_field] == null || keys[filter_field].indexOf(filter) != -1 ) { continue; }
                }
            }
            var sampleDateFrom = values[dateFromKey];
            var sampleDateTo = values[dateToKey];
            if(projects[pid] == undefined) {
                projects[pid] = {
                                    "type": type,
                                    "appl": appl,
                                    "pf": pf,
                                    "num_samples": 1,
                                    "fromDate": sampleDateFrom,
                                    "toDate": sampleDateTo,
                                    "daydiff": daydiff(new Date(sampleDateFrom), new Date(sampleDateTo))
                                }
            } else {
                if(sampleDateFrom < projects[pid]["fromDate"]) { projects[pid]["fromDate"] = sampleDateFrom; }
                if(sampleDateTo > projects[pid]["toDate"]) { projects[pid]["toDate"] = sampleDateTo; }
                projects[pid]["daydiff"] = daydiff(new Date(projects[pid]["fromDate"]), new Date(projects[pid]["toDate"]));
                projects[pid]["num_samples"]++;
            }
        }

        // out data structure: [ order, daydiff, num_samples, doneDate, project_id ]. Order is added after date sort
        for (var pid in projects) {
            // if fromDate or toDate is 0000-00-00 not all samples are done, so ignore
            if (projects[pid]["fromDate"] == "0000-00-00" || projects[pid]["toDate"] == "0000-00-00") { continue; }

            //// check if data is in scope
            //// within date range
            var toDate = new Date(projects[pid]["toDate"]);
            if (toDate < dateRangeStart || toDate > dateRangeEnd) { continue; }
            
            // we find ourselves with a project that has a toDate within range, so write it to the output array
            dataArray.push([
                projects[pid]["daydiff"],
                projects[pid]["num_samples"],
                new Date(projects[pid]["toDate"]),
                pid
            ]);
        }
        
        dataArray.sort(dateValueSort);    
        // add order number as first element in each array
        for (var j = 0; j < dataArray.length; j++) {
                var tmpdata = dataArray[j];
                tmpdata.unshift(j + 1);
                //console.log(tmpdata[4]); // project ID
        }
        return dataArray;
        
}

/**
 * Generates a dataset for boxplots based on a specified index of the values
 * @param {Array} dataset		An array of arrays (the dataset used to generate the runchart)
 * @param {Number} index		index of the array that contains the value
 * @returns {Array} 			An array of arrays of values. 
 */
function generateGenericBoxDataset (dataset, index) {
        var dataArray = [];
        dataArray[0] = [];
        for (var i = 0; i<dataset.length; i++) {
                dataArray[0].push(dataset[i][index]);
        }
        return dataArray;
}


// calculate # lanes started for sequencing. WORK IN PROGRESS
function calculateLanesStarted (json, startDate, cmpDate) {
    var jsonrows = json.rows;
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    var startDateStr = dateFormat(startDate);
    //console.log(startDateStr + " - " + cmpDateStr);
    
    var tot = { HiSeq: 0, MiSeq: 0, HiSeqSamples: 0, MiSeqSamples: 0 };
    for (var i=0; i<jsonrows.length; i++) {
        var seqStartDate = jsonrows[i]["value"]["Sequencing start"];
        var pf = jsonrows[i]["key"][3];
        if (pf != "MiSeq") {
            pf = "HiSeq";
        }
        if (seqStartDate >= startDateStr && seqStartDate <= cmpDateStr) {
            var lanes = jsonrows[i]["value"]["Lanes"];
            //console.log("lanes: " + lanes);
            tot[pf] += lanes;
            if(pf == "HiSeq") {
                tot["HiSeqSamples"]++;
            } else if (pf == "MiSeq") {
                tot["MiSeqSamples"]++;
            }
        }
    }
    tot.HiSeq = parseFloat(tot.HiSeq).toFixed(1);
    tot.MiSeq = parseFloat(tot.MiSeq).toFixed(1);
    return tot;
}
// calculate # lanes started for sequencing. WORK IN PROGRESS
function calculateWorksetsStarted (json, startDate, cmpDate) {
    var jsonrows = json.rows;
    var dateFormat = d3.time.format("%Y-%m-%d");
    var cmpDateStr = dateFormat(cmpDate); // Turn cmp date into a string to compare to dates in data
    var startDateStr = dateFormat(startDate);
    //console.log(startDateStr + " - " + cmpDateStr);
    
    var tot = { DNA: 0, RNA: 0, SeqCap: 0, Other: 0 };
    for (var i=0; i<jsonrows.length; i++) {
        var prepStartDate = jsonrows[i]["value"]["Lib prep start"];
        var appl = jsonrows[i]["key"][2];
        
        //console.log(appl);

        var applCat = "";
        if(appl == null) {
            applCat = "Other";
        } else if (appl.indexOf("capture") != -1) {
            applCat = "SeqCap";
        } else if (appl == "Amplicon" ||
                   appl == "de novo" ||
                   appl == "Metagenome" ||
                   appl == "WG re-seq") {
            applCat = "DNA";
        } else if (appl == "RNA-seq (total RNA)") {
            applCat = "RNA";
        } else {
            applCat = "Other";
        }

        
        if (prepStartDate >= startDateStr && prepStartDate <= cmpDateStr) {
            tot[applCat]++;
        }
    }
    return tot;
}


/**
 * Code to draw the run chart plot
 * @param {Object} dataset  Parsed json object
 * @param {String} divID    Id of DOM div to where plot should reside
 * @param {Array} clines    Array of numbers representing where x week control lines should be drawn, e.g.[6, 10]
 * @param {Number} width    plot width
 * @param {Number} height   plot height
 * @param {Number} [padding=30] plot padding
 * @param {Number} [maxY] Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawRunChart(dataset, divID, clines, width, height, padding, maxY) {
    // Set default padding
    if(padding === undefined) {
        padding = 30;
    }
    // DOM id for svg object
    var svgID = divID + "SVG";
    
    // DOM id for data line
    var dataLineID = divID + "data_line";
    
    
    // Time format
    var dateFormat = d3.time.format("%Y-%m-%d");

    
    //Create scale functions
    if(maxY == undefined) {
        maxY = d3.max(dataset, function(d) { return d[1]; });
    }
    var xScale = d3.scale.linear()
            .domain([0, dataset.length])
            .range([padding, width - padding * 0.5]);
    
    var yScale = d3.scale.linear()
            //.domain([0, d3.max(dataset, function(d) { return d[1]; })])
            .domain([0, maxY])
            .range([height - padding, padding]);

    //Define X axis
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .ticks(5);
    
    //Define Y axis
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(5);
    
    // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    var newchart = false;
    //if(svg == undefined) {
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("id", svgID);
    }


    // remove old circles and lines if updating chart
    if(!newchart) { 
        var circles = svg.selectAll("circle");
        circles.remove();
        var l = svg.select("#" + dataLineID); 
        l.remove();
    }
    //Create circles
    svg.selectAll("circle")
       .data(dataset)
       .enter()
       .append("circle")
       .attr("cx", function(d) {
            return xScale(d[0]);
       })
       .attr("cy", function(d) {
            return yScale(d[1]);
       })
       .attr("r", 4)
       .on("mouseover", function(d) {
            d3.select(this)
              .attr("r", 7)
              .attr("fill", "blue")
              ;
            var xPosition = xScale(d[0]) + 10;
            var yPosition = yScale(d[1]);
            //Create the tooltip label
            svg.append("text")
              .attr("id", "tooltip1")
              .attr("x", xPosition)
              .attr("y", yPosition)
            //.text(d[2])
            .text(d[4])
            ;
            svg.append("text")
              .attr("id", "tooltip2")
              .attr("x", xPosition)
              .attr("y", yPosition + 13)
            .text(dateFormat(d[3]))
            ;
            svg.append("text")
              .attr("id", "tooltip3")
              .attr("x", xPosition)
              .attr("y", yPosition + 26)
            .text(d[1] + " days")
            ;	

       })
       .on("mouseout", function(d) { //Remove the tooltip
            d3.select(this)
              .attr("r", 4)
              .attr("fill", "black")
              ;
               d3.select("#tooltip1").remove();
               d3.select("#tooltip2").remove();
               d3.select("#tooltip3").remove();
       })
       .on("click", function(d) {
                var projID = d[4];
                var url = "http://genomics-status.scilifelab.se/projects/" + projID;
                window.open(url, "genomics-status");
       })
    ;
    // Add line (needs sorted array for lines to make sense)
    var line = d3.svg.line()
        .x(function(d) { return xScale(d[0]); })
        .y(function(d) { return yScale(d[1]); });
    
    svg.append("path")
          .attr("class", "line")
          .attr("d", line(dataset))
          .attr("id", dataLineID); 

    // create or update axis   
    if(newchart){
        //Create X axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height - padding) + ")")
            .call(xAxis);
        //Create Y axis
        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);
    } else {
        //Update X axis
        svg.select(".x.axis")
            .transition()
            .duration(1000)
            .call(xAxis);
        //Update Y axis
        svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(yAxis);       
    }
    // add axis labels
    if(newchart) {
        // y axis label
        svg.append("text")
            .attr("y", padding - 10 )
            .attr("x", padding)
            .attr("class", "axis_label")
            .text("days");
        // x axis label
        svg.append("text")
            .attr("y", height - 3)
            .attr("x", width)
            .attr("class", "axis_label")
            .text("project #");
        
    }
    
    // define a straight line function for control lines
    var clLine = d3.svg.line()
        .x(function(d) { return xScale(d[0]); })
        .y(function(d) { return yScale(d[1]); });
    
    // add control lines
    for(var i = 0; i < clines.length; i++) {
        var sw = 3;
        if (i > 0) { sw = 1.5; }
        var lineY = clines[i] * 7;
        var lineID = "line_" + clines[i] + "_weeks";
        var labelText = clines[i] + " weeks";
        var labelOffset = 1;
        var labelY = lineY + labelOffset
        var labelID = "text_" + clines[i] + "_weeks";
        var xTPosition = xScale(0.1);
        var yTPosition = yScale(labelY);
        if (newchart) {
            svg.append("path")
                .attr("class", "ucl_line")
                .attr("id", lineID)
                .attr("stroke-width", sw)
                .attr("d", clLine(
                                   [[0, lineY], [dataset.length, lineY]]
                                   ))
                ;
            //Create the line label
            svg.append("text")
                .attr("class", "line_label")
                .attr("id", labelID)
                .attr("x", xTPosition)
                .attr("y", yTPosition)
            .text(labelText)
            ;        
        } else {
            svg.select("#" + lineID)
                .transition()
                .duration(1000)
                .attr("d", clLine(
                                [[0, lineY], [dataset.length, lineY]]
                            ))
                ;
            //Move the line label
            svg.select("#" + labelID)
                .transition()
                .duration(1000)
                .attr("x", xTPosition)
                .attr("y", yTPosition)
                ;
        }
    }
}



/**
 * Code to draw a boxplot
 * @param {Object} dataset  Parsed data
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Number} plotHeight plot height
 */
function drawBoxPlot(dataset, divID, plotHeight, maxY, bottom_margin) {
    var margin = {top: 30, right: 20, bottom: 30, left: 20},
        width = 60 - margin.left - margin.right,
        //height = 450 - margin.top - margin.bottom;
        //height = 400 - margin.top - margin.bottom;
        height = plotHeight - margin.top - margin.bottom;
    // DOM id for svg object

    var svgID = divID + "SVG";
    //console.log("svgID: " + svgID);
    var min = Infinity,
        max = -Infinity;
    
    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(width)
        .height(height);

    if (maxY == undefined) {
        max = d3.max(dataset[0]);        
    } else {
        max = maxY;
    }
    //min = d3.min(dataset[0]);
    min = 0;
    //console.log("min: " + min + ", max: " + max);
    chart.domain([min, max]);


        // Get SVG element (or create a new if not existing)
    var svg = d3.select("#" + svgID);
    var newchart = false;
    if(svg[0][0] == null) {
        newchart = true;
        //Create new SVG element
        svg = d3.select("#" + divID).selectAll("svg")
            .data(dataset)
            .enter().append("svg")
            .attr("class", "box")
            .attr("id", svgID)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(chart)
            ;
        //console.log("appended svg:")
        //console.log(typeof(svg[0][0]));        
    } else {
        var g = d3.select("#" + divID)
            .selectAll("svg")
            .selectAll("g")
            .data(dataset)
            .transition() // doesn't work!
            .duration(1000)
            .call(chart)
            ;
        
    }

}


/**
 * Code to draw barchart plot. 
 * CURRENTLY ONLY USED FOR PROBLEM KPIS, THAT ARE NOT ACTIVE AT THE MOMENT
 * @param {Object} dataset Parsed json dataset
 * @param {String} divID Id of DOM div to where plot should reside
 * @param {Array} labels Array of labels, e.g.["Rec ctrl", "Lib prep", "Seq"]
 * @param {Number} width plot width
 * @param {Number} height plot height
 * @param {Number} [padding=30] plot padding
 * @param {Number} [maxY] Max value of y axis. To be able to draw different panels on the same scale 
 */
function drawBarchartPlot(dataset, divID, width, height, bottom_padding, maxY) {
    var labels = [];
    for (var i = 0; i < dataset.length; i++) {
        labels.push(dataset[i].key);
    }
    
    if (maxY == undefined) {
        maxY = d3.max(dataset, function(d) {return d.value;});
    }
    var xScale = d3.scale.ordinal()
                    .domain(d3.range(dataset.length))
                    .rangeRoundBands([0, width], 0.05);
    
    var yScale = d3.scale.linear()
                    //.domain([0, d3.max(dataset, function(d) { return d.value; })])
                    .domain([0, maxY])
                    .range([0, height - bottom_padding]);
    
    //Define key function, to be used when binding data
    var key = function(d) {
        return d.key;
        //return d.step;
    };
    
    //Create SVG element
    //var svg = d3.select("#barchart")
    var svg = d3.select("#" + divID)
                .append("svg")
                .attr("width", width)
                .attr("height", height);
    
    //Create bars
    svg.selectAll("rect")
       .data(dataset, key)		//Bind data with custom key function
       .enter()
       .append("rect")
       .attr("x", function(d, i) {
            return xScale(i);
       })
       .attr("y", function(d) {
            return (height - bottom_padding) - yScale(d.value);
       })
       .attr("width", xScale.rangeBand())
       .attr("height", function(d) {
            return yScale(d.value);
       })
       //.attr("fill", function(d) {
       //     return "rgb(0, 0, " + (d.value * 10) + ")";
       //})
       ;
    
    var smallFormat = d3.format(".00r");
    //Create labels
    svg.selectAll("text")
       .data(dataset, key)		//Bind data with custom key function
       .enter()
       .append("text")
       .text(function(d) {
            if(d.value == 0) { return ""; }
            if(d.value < 1) { return smallFormat(d.value); }
            return d.value;
       })
       .attr("class", "bar_label")
       .attr("text-anchor", "middle")
       .attr("x", function(d, i) {
            return xScale(i) + xScale.rangeBand() / 2;
       })
       .attr("y", function(d) {
            //return (height - bottom_padding) - yScale(d.value) + 14;
            return (height - bottom_padding) - yScale(d.value) + 19;
       })
       ;
    // Check if there is info about total data set size, and if so add text to show that   
    var hasTotal = function(dSet) {
        for (var i = 0; i < dSet.length; i++) {
            if(dSet[i].total) { return true; }    
        }
        return false;
    }
    if(hasTotal(dataset)) {
        //console.log("We have total");
        //console.log(dataset);
        svg.selectAll("text")
           .data(dataset, key)		//Bind data with custom key function
           .enter()
           .append("text")
           .text(function(d) {
                //if(d.value < 1) { return smallFormat(d.value); }
                var totStr = "(" + d.total + ")";
                console.log("TotStr: " + totStr);
                return totStr;
           })
           .attr("class", "bar_label")
           .attr("text-anchor", "middle")
           .attr("x", function(d, i) {
                return xScale(i) + xScale.rangeBand() / 2;
           })
           .attr("y", function(d) {
                //return (height - bottom_padding) - yScale(d.value) + 14;
                return (height - bottom_padding) - yScale(d.value) + 19;
           })
           .attr("dy", 10)
           ;
        
    }
    //Define X axis
    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .tickValues(labels)
                      ;
    //Create X axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - bottom_padding) + ")")
        .call(xAxis);
    
}

/**
 * Code to draw the all the process panels plots
 * @param {Object} sample_json  Parsed json object for all the sample data
 * @param {Date} plotDate Date for which to draw data
 * @param {Date} startDate Date to start from
 * @param {Number} height panel plot height
 * @param {Number} draw_width available drawing widths
 */
function drawProcessPanels(sample_json, plotDate, startDate, height, draw_width){
    // Reduce sample data to project level
    var reduced = reduceToProject(sample_json);
    //console.log(reduced);

    // keys for time calculations
    var total = {
        startKey: "Queue date",
        endKey: "All samples sequenced"
    };
    var recCtrl = {
        startKey: "Arrival date",
        endKey: "Queue date"
    };
    var libPrep = {
        startKey: "Queue date",
        endKey: "QC library finished"
    };
    var seq = {
        startKey: "QC library finished",
        endKey: "All samples sequenced"
    };

    /* 
     *  17 bars to draw over the width of the window in the upper half
     */ 
    var bar_width = (draw_width + 320) / 17; 
    
    /* 
     *  4 run chart panels on the lower half
     */ 
    var rc_width = draw_width / 4; // 

    /* Upper half panels 
     ***********************************************************
    */
    
    ///////////////////
    // testing number of lanes and prep starts calculations. MOVE out of this function?
    var numLanes = calculateLanesStarted (sample_json, twelveWeeks, today);
    var numPreps = calculateWorksetsStarted (sample_json, twelveWeeks, today);
    //console.log(numLanes);
    //console.log(numPreps);    
    d3.select("#lane_starts").text(parseFloat(numLanes.HiSeq/12).toFixed(1) + " / " + parseFloat(numLanes.MiSeq/12).toFixed(1)
                                   + " (" + parseFloat(numLanes.HiSeqSamples/12).toFixed(1) + "/" + parseFloat(numLanes.MiSeqSamples/12).toFixed(1) + " samples)");
    d3.select("#prep_starts").text(parseFloat(numPreps.DNA /12).toFixed(2) + " / " + parseFloat(numLanes.RNA/12).toFixed(2)
                                   + " / " + parseFloat(numPreps.SeqCap/12).toFixed(2) + " / " + parseFloat(numPreps.Other/12).toFixed(2));
    ////////////////// end test bit
    
    // The ongoing calculations
    var recCtrlLoad = generateRecCtrlStackDataset(sample_json, today);
    var sampleQueue = generateQueueSampleStackDataset(sample_json, today);
    var libprepLaneQueue = generateQueueLaneLPStackDataset(sample_json, today);
    var finlibLaneQueue = generateQueueLaneFLStackDataset(sample_json, today);
    var sampleLoadLibprep = generateLibprepSampleLoadDataset(sample_json, today);
    var laneLoadLibprep = generateLibprepLaneLoadDataset(sample_json, today);
    var seqLoad = generateSeqLoadDataset(sample_json, today);
        

    drawRCStackedBars(recCtrlLoad, "ongoing_bc_plot", bar_width * 1, panelHeights);
    drawStackedBars (sampleQueue, "queue_sample_load_lp", bar_width * 4, panelHeights, "samples");
    drawStackedBars (libprepLaneQueue, "queue_lane_load_lp", bar_width * 2, panelHeights, "lanes");
    drawStackedBars (finlibLaneQueue, "queue_lane_load_fl", bar_width * 2, panelHeights, "lanes");
    drawStackedBars(sampleLoadLibprep, "libprep_sample_load", bar_width * 4, panelHeights, "samples");
    drawStackedBars(laneLoadLibprep, "libprep_lane_load", bar_width * 2, panelHeights, "lanes");
    drawStackedBars (seqLoad, "seq_load_stack", bar_width * 2, panelHeights, "lanes");
    
        
    /* Lower half panels
     ***********************************************************
    */
    
    /* **** Total delivery times data sets **** */
    var totalRcDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true);
    var totalBpDataset = generateGenericBoxDataset(totalRcDataset, 1);
        /* ** Subsets ** */
        // LibPrep projects
    var totalRcLPDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "Finished library", true);
    var totalBpLPDataset = generateGenericBoxDataset(totalRcLPDataset, 1);
        // Finished library projects
    var totalRcFLDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "Finished library");   
    var totalBpFLDataset = generateGenericBoxDataset(totalRcFLDataset, 1);
        // MiSeq projects
    var totalRcMiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "MiSeq");
    var totalBpMiSeqDataset = generateGenericBoxDataset(totalRcMiSeqDataset, 1);
        // HiSeq projects
    var totalRcHiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, total.startKey, total.endKey, true, "HiSeq");
    var totalBpHiSeqDataset = generateGenericBoxDataset(totalRcHiSeqDataset, 1);
    

    /* **** RecCtrl delivery times data sets **** */
    var recCtrlDataset = generateRunchartDataset(reduced, startDate, plotDate, recCtrl.startKey, recCtrl.endKey, true);
    var recCtrlBpDataset = generateGenericBoxDataset(recCtrlDataset, 1);

    /* **** Libprep delivery times data sets **** */
    var libPrepDataset = generateRunchartDataset(reduced, startDate, plotDate, libPrep.startKey, libPrep.endKey, true, "Finished library", true); 
    var libPrepBpDataset = generateGenericBoxDataset(libPrepDataset, 1);
    
    /* **** Seq datasets for all projects **** */
    var seqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true); 
    var seqBpDataset = generateGenericBoxDataset(seqDataset, 1);
        /* ** Subsets ** */
        // MiSeq projects
    var seqMiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true, "MiSeq"); 
    var seqBpMiSeqDataset = generateGenericBoxDataset(seqMiSeqDataset, 1);
        // HiSeq projects
    var seqHiSeqDataset = generateRunchartDataset(reduced, startDate, plotDate, seq.startKey, seq.endKey, true, "HiSeq"); 
    var seqBpHiSeqDataset =generateGenericBoxDataset(seqHiSeqDataset, 1);

    
    // get highest value in the runchart data sets to set a common scale
    var maxTot = d3.max(totalRcDataset, function(d) {return d[1];});
    var maxRC = d3.max(recCtrlDataset, function(d) {return d[1];});
    var maxLP = d3.max(libPrepDataset, function(d) {return d[1];});
    var maxSeq = d3.max(seqDataset, function(d) {return d[1];});
    maxStepY = Math.max(maxTot, maxRC, maxLP, maxSeq)

    /* ***** Draw the panels with the first data **** */
    // Redrawing of subsets for total & seq times is done in the setInterval call below
    drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
    drawBoxPlot(totalBpDataset, "total_bp", height);
    
    drawRunChart(recCtrlDataset, "rec_ctrl_rc", [2], rc_width, height, 30, maxStepY);
    drawBoxPlot(recCtrlBpDataset, "rec_ctrl_bp", height, maxStepY);
        
    drawRunChart(libPrepDataset, "lib_prep_rc", [2.5], rc_width, height, 30, maxStepY); 
    drawBoxPlot(libPrepBpDataset, "lib_prep_bp", height, maxStepY); 
    
    drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    drawBoxPlot(seqBpDataset, "seq_bp", height, maxStepY);
    
    

    //// just redraw once for testing
    //            drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 10], rc_width, height, 30);
    //            drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
    //            d3.select("#total_legend").text("Total delivery times - MiSeq projects");
    //            
    //            drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
    //            drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
    //            d3.select("#seq_legend").text("Sequencing  delivery times - MiSeq projects");

    /* **** Redraw with subsets at regular intervals **** */
    var setNo = 2;
    window.setInterval(function(){
        switch(setNo) {
            // Start state
            case 1:
                drawRunChart(totalRcDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: default").text("All projects");
                
                drawRunChart(seqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: default").text("All projects");
                
                setNo++;
                break;
            // Libprep proj
            case 2:
                drawRunChart(totalRcLPDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpLPDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Lib prep projects");
                setNo++;
                break;
            // Finished lib proj
            case 3:
                drawRunChart(totalRcFLDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpFLDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("Finished library projects");
                setNo++;
                //setNo = 1;
                break;
            // MiSeq proj
            case 4:
                drawRunChart(totalRcMiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpMiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("MiSeq projects");
                
                drawRunChart(seqMiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpMiSeqDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: orange").text("MiSeq projects");
                setNo++;
                
                break;
            // HiSeq proj
            case 5:
                drawRunChart(totalRcHiSeqDataset, "total_rc", [6, 4, 10], rc_width, height, 30);
                drawBoxPlot(totalBpHiSeqDataset, "total_bp", height);
                d3.select("#total_legend").attr("style", "color: orange").text("HiSeq projects");
                
                drawRunChart(seqHiSeqDataset, "seq_rc", [3], rc_width, height, 30, maxStepY);
                drawBoxPlot(seqBpHiSeqDataset, "seq_bp", height, maxStepY);
                d3.select("#seq_legend").attr("style", "color: orange").text("HiSeq projects");
                setNo = 1;
                
                break;
        }
    },
        //3000
        //9000
        20000
        //99999999
    );

}