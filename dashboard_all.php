<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Genomics <?php echo (isset($_GET['ptype'])? $_GET['ptype'] : 'Production'); ?> Dashboard</title>
		<script type="text/javascript" src="d3/d3.v3.js"></script>
        <script type="text/javascript" src="d3/box.js"></script>
	    <script type="text/javascript" src="d3/colorbrewer.js"></script>
		<script type="text/javascript" src="dashboard.js"></script>
		<script type="text/javascript" src="dashboard_problems.js"></script>
		<script type="text/javascript" src="stack.js"></script>
        <link rel="stylesheet" type="text/css" href="dashboard.css">
	</head>
	<body>
        <!--Empty invisible tooltip div-->
        <div class="tooltip" style="opacity: 0"></div>
  

		<div id="header">
            <div id="header_title">
                <h1 id="title">Genomics Process status</h1>
                <span id="date"></span> - <em>Data for the previous 12 weeks</em>
            </div>
            <div id=starts style="display: none">
                Sequencing lanes started/week (HiSeq/MiSeq): <span id="lane_starts"></span><br>
                Lib prep samples started/week (DNA/RNA/SeqCap/Other): <span id="prep_starts"></span>
            </div>
        </div>
        <br class="clear">
        <div id="status_panels">
            <!--Old ongoing panel - change to only show rec ctrl-->
			<div id="ongoing_bc">
                <h2>Rec Ctrl - All</h2>
				<div id="ongoing_bc_plot">
					<h3># projects</h3>
				</div>
            </div>
            
			<!--Queue panels -->
			<div id="queue">
				<h2>Queue - <?php echo (isset($_GET['ptype'])? $_GET['ptype']: 'Production'); ?> (Queue date, but not started)</h2>
				<div id="load_charts">
					<div id="queue_lp_load"> <!--was queue_sample_load - rename-->
						<h3 style="float: left">Lib prep</h3>
                        <div class="stack_legend_h3">
                            <span class="fiq_col_legend">1</span>
                            first in queue
                            <span class="norm1_col_legend">1</span>
                            <span class="norm2_col_legend">1</span>
                            &le;10 days in prod
                        </div>
                        <br class="clear">
						
                        <div id="queue_sample_load_lp"> <!--NEW-->
                            <h4 style="float: left">Samples</h4>
                            <div class="stack_legend_h4">
                                <span class="limit_1_legend">1</span>
                                &gt;10 days in prod

                                <span class="limit_2_legend">1</span>
                                &gt;20 days in prod
                            </div>
                            <br class="clear">
                        </div>
						<div id="queue_lane_load_lp">
							<h4>Lanes</h4>
						</div>
					</div>
					<div id="queue_fl_load"> <!--was queue_lane_load-->
						<h3>Finished lib</h3>
						<div id="queue_lane_load_fl">
							<h4>Lanes</h4>            
						</div>
					</div>
				</div>
			</div>
            <!--Ongoing panels -> change to load-->
            <div id="ongoing">
                <h2>Ongoing - <?php echo (isset($_GET['ptype'])? $_GET['ptype']: 'Production'); ?> (started, but not delivered)</h2>
                <div id="ongoing_load_charts">
                    <div id="libprep_load">
                        <h3 style="float: left; margin-right: 22px">Lib prep</h3>
                        <div class="stack_legend_h3">
                            <span class="norm1_col_legend">1</span>
                            <span class="norm2_col_legend">1</span>
                            &le;6 weeks in prod
                        </div>
                        <br class="clear">
                         <div id="libprep_sample_load">
                            <h4 style="float: left">Sample load</h4>
                            <div class="stack_legend_h4">
                                <span class="limit_1_legend">1</span>
                                &gt;6 weeks in prod

                                <span class="limit_2_legend">1</span>
                                &gt;9 weeks in prod
                            </div>
                            <br class="clear">
                        </div>
                        <div id="libprep_lane_load">
                            <h4>Lane load</h4>
                        </div>
                    </div>
                    <div id="seq_load">
                        <h3>Sequencing</h3>                       
                        <div id="seq_load_stack">
                            <h4>Lane load</h4>
                        </div>
                    </div>
                </div>
            </div>
            <br class="clear">
            <!--Delivery time run charts-->
            <div id="total_del_times" class="times_panel">
                <h2>Total delivery times - <span id="total_legend">All projects</span></h2>
                <h3>Days = from 'Queue date' to 'All raw data delivered'</h3>
                <h3 style="visibility: hidden">Hidden heading</h3> <!--To make drawing panels level with each other-->
                <div id="total_rc">
                    <!--<h3>Run chart</h3>-->
                    <!--<h3 id="total_rc_legend">All projects</h3>-->
                </div>
                <div id="total_bp" class="boxplot_panel">
                    <!--<h3>Variability</h3>-->
                    <!--<h3 id="total_bp_legend">All projects</h3>-->
                </div>
            </div>
            <div id="rec_ctrl_del_times" class="times_panel">
                <h2 id="rec_ctrl_legend">Rec control delivery times - All projects</h2>
                <h3 class="first_series_heading">Days = from 'Open date' to 'Queue date'</h3>
                <h3 class="second_series_heading">Days = from 'Rec ctrl start' to 'Queue date'</h3>
                <div id="rec_ctrl_rc">
                    <!--<h3>Run chart</h3>-->
                    <!--<h3 id="rec_ctrl_rc_legend">All projects</h3>-->
                </div>
                <div id="rec_ctrl_bp" class="boxplot_panel">
                    <!--<h3>Variability</h3>-->
                    <!--<h3 id="rec_ctrl_bp_legend">All projects</h3>-->
                    <div id="rec_ctrl_bp1" class="boxplot_panel"></div>
                    <div id="rec_ctrl_bp2" class="boxplot_panel"></div>
                </div>
            </div>
            <div id="lib_prep_del_times" class="times_panel">
                <h2 id="lib_prep_legend">Lib prep delivery times - Lib prep projects</h2>
                <h3 class="first_series_heading">Days = from 'Queue date' to 'Library QC'</h3>
                <h3 class="second_series_heading">Days = from 'Lib prep start' to 'Library QC'</h3>
                <div id="lib_prep_rc">
                    <!--<h3>Run chart</h3>-->
                    <!--<h3 id="lib_prep_rc_legend">All projects</h3>-->
                </div>
                <div id="lib_prep_bp" class="boxplot_panel">
                    <!--<h3>Variability</h3>-->
                    <!--<h3 id="lib_prep_bp_legend">All projects</h3>-->
                    <div id="lib_prep_bp1" class="boxplot_panel"></div>
                    <div id="lib_prep_bp2" class="boxplot_panel"></div>
                </div>
            </div>
            <div id="seq_del_times" class="times_panel">
                <h2>Sequencing delivery times - <span id="seq_legend">All projects</span></h2>
                <h3 class="first_series_heading">Days = from 'Library QC' to 'All samples sequenced'</h3>
                <h3 class="second_series_heading">Days = from 'Seq start' to 'All samples sequenced'</h3>
                <div id="seq_rc">
                    <!--<h3>Run chart</h3>-->
                    <!--<h3 id="seq_rc_legend">All projects</h3>-->
                </div>
                <div id="seq_bp" class="boxplot_panel">
                    <!--<h3>Variability</h3>-->
                    <!--<h3 id="seq_bp_legend">All projects</h3>-->
                    <div id="seq_bp1" class="boxplot_panel"></div>
                    <div id="seq_bp2" class="boxplot_panel"></div>
                </div>
            </div>
			<div id="bioinfo_del_times" class="times_panel">
				<h2>Bioinfo</h2>
				<h3 class="third_series_heading">QC</h3>
                <h3 style="visibility: hidden">Hidden heading</h3> <!--To make drawing panels level with each other-->
				<div id="bi_bp" class="boxplot_panel">
					<div id="bi_bp1" class="boxplot_panel"></div>
				</div>
			</div>
            <br class="clear">
        </div>
        <!--"Problem panels"-->
        <div id="problem_panels"  style="display: none">
            <div id="fs_prog_bc" class="barchart_panel">
                <h2>Rec control</h2>
                <p>samples progressed failed in rec ctrl</p>
            </div>
    
            <div id="failed_samples_per_workset"  class="times_panel">
                <h2>Lib prep - #failed samples/workset</h2>
                <div id="fs_ws_rc">
                    <h3>Run chart</h3>
                </div>
                <div id="fs_ws_bp" class="boxplot_panel">
                    <h3>Variability</h3>
                    <!--<h3 id="seq_bp_legend">All projects</h3>-->
                </div>
            </div>
            <div id="data_delivered"  class="times_panel">
                <h2>Seq - data delivered / data ordered</h2>
                <div id="data_del_rc">
                    <h3>Run chart</h3>
                </div>
                <div id="data_del_bp" class="boxplot_panel">
                    <h3>Variability</h3>
                </div>
            </div>
        </div>
		<script type="text/javascript">
            // Reload window every hour
            var oneHour = 1000*60*60;
            window.setTimeout(function() {
                        window.location.reload();
                },
                //20000
                oneHour
            );

            var today = new Date(); // today
			var twelveWeeks = new Date( today.getTime() - 12 * 7 * 1000*60*60*24);
			var winWidth = window.innerWidth;
            var winHeight = window.innerHeight;
            //console.log("w: " + winWidth + ", h: " + winHeight);
			
			var panelHeights = (winHeight - 232) / 2;						
			var drawWidth = (winWidth - 500);
			//var drawWidth = (winWidth - 600);

            //var dateStr = today.getFullYear() + "-" + today.getMonth() + "-" + today.getDate();    
            var dateStr = today.toDateString();    
			d3.select("#date")
                .text(dateStr);
            
            /* 
            * Database server source
            */ 
            var dbSource = "" ;// local, local_dev, dev or "" (=tools)
            //var dbSource = "dev" // local, local_dev, dev or "" (=tools)
            //var dbSource = "local" // local, local_dev, dev or "" (=tools)
            //var dbSource = "local_dev" // local, local_dev, dev or "" (=tools)
            var ptype="Production";
            <?php
               // grabbing php paramters and shamelessly plugging them in js
            if (isset ($_GET['dbsource'])){
                echo 'dbSource = "'.$_GET['dbsource'].'";'; 
            }
           if (isset($_GET['ptype'])){
                echo 'ptype = "'.$_GET['ptype'].'";'; 
            }
            ?> 
            /*
             * Get data for projects & draw
             */
            var dataUrl = "getCouchDbData.php?db=projects&design=genomics-dashboard&view=dates_and_load_per_sample&reduce=false&" + dbSource;
            d3.json(dataUrl, function(json){
                drawProcessPanels(json, today, twelveWeeks, panelHeights, drawWidth, ptype);
            });
                    
            // Problem KPIs. Not shown at the moment
            //var failedProgUrl = "getCouchDbData.php?db=projects&design=kpi_external&view=KPI1&reduce=false&" + dbSource;
            //d3.json(failedProgUrl, function(json){
            //    //console.log(json);
            //    var fpDataset = generateFailedProgressedDataset(json, today);
            //    //console.log(fpDataset);
            //    //drawBarchartPlot(fpDataset, "fs_prog_bc", 500, panelHeights, 30);
            //    drawBarchartPlot(fpDataset, "fs_prog_bc", (rcWidth + 110), panelHeights, 30);
            //});
            //
            //var wsFailRateUrl = "getCouchDbData.php?db=projects&design=kpi_external&view=KPI2&reduce=false&" + dbSource;
            //d3.json(wsFailRateUrl, function(json){
            //    //console.log("Workset failrate dataset:");
            //    //console.log(json);
            //    var d = generateWorksetFailureDataset (json, twelveWeeks, today);
            //    //console.log(d);
            //    drawFailedLpRunChart(d, "fs_ws_rc", [], rcWidth, panelHeights, 30);
            //    var bd = generateGenericBoxDataset(d, 1);
            //    //console.log(bd);
            //    drawBoxPlot(bd, "fs_ws_bp", panelHeights);
            //});
            //
            //var delDataUrl = "getCouchDbData.php?db=projects&design=kpi_external&view=KPI3_1&reduce=false&" + dbSource;
            //d3.json(delDataUrl, function(json){
            //    var delDataDataset = generateDeliveredDataDataset (json, twelveWeeks, today);
            //    //console.log("Data del dataset");
            //    //console.log(delDataDataset);
            //    drawDeliveredDataRunChart(delDataDataset, "data_del_rc", [], rcWidth, panelHeights, 30);
            //    var bd = generateGenericBoxDataset(delDataDataset, 1);
            //    drawBoxPlot(bd, "data_del_bp", panelHeights);
            //});
			
            
            /**
             * Code for cycling between showing status kpis and problem kpis
             * Not used at the moment
             */
            //window.setInterval(function() {
            //    //console.log("in cycling function");
            //    problems_displayed = (d3.select("#problem_panels").attr("style") == "display: block");
            //    if(problems_displayed) {
            //        d3.select("#problem_panels").attr("style", "display: none");
            //        d3.select("#status_panels").attr("style", "display: block");
            //    } else {
            //        d3.select("#status_panels").attr("style", "display: none");
            //        d3.select("#problem_panels").attr("style", "display: block");
            //        
            //    }
            //}, 120000);

 
		</script>


	</body>
</html>
