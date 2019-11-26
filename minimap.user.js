﻿// ==UserScript==
// @name         Minimap V2.0
// @version      1.3
// @match        https://pixelzone.io/*
// @match        http://pixelzone.io/*
// ==/UserScript==
/*
                    ...
*/

Number.prototype.between = function(a, b) {
  var min = Math.min.apply(Math, [a, b]),
    max = Math.max.apply(Math, [a, b]);
  return this > min && this < max;
};
var range = 25;
window.baseTepmlateUrl = 'https://raw.githubusercontent.com/nakazan/minikarta/master/';

setTimeout(init, 3000);

function init() {
    //Regular Expression to get coordinates out of URL
    re = /(.*)\/\?p=(\-?(?:\d*)),(\-?(?:\d*))/g;
    //Regular Expression to get coordinates from cursor
    rec = /x\:(\d*) y\:(\d*)/g;
    gameWindow = document.getElementById("canvas");
    //DOM element of the displayed X, Y variables
    coorDOM = null;
    findCoor();
    //coordinates of the middle of the window
    x_window = 0;
    y_window = 0;
    //coordinates of cursor
    x = 0;
    y = 0;
    //list of all available templates
    template_list = null;
    zoomlevel = 9;
    //toggle options
    toggle_show = true;
    toggle_follow = true; //if minimap is following window, x_window = x and y_window = y;
    zooming_in = false;
    zooming_out = false;
    zoom_time = 100;
    //array with all loaded template-images
    image_list = [];
    counter = 0;
    //templates which are needed in the current area
    needed_templates = null;
    //Cachebreaker to force refresh
    cachebreaker = null;

    var div = document.createElement('div');
    div.setAttribute('class', 'post block bc2');
    div.innerHTML = '<style>.grecaptcha-badge{display: none;}</style> <div id="minimapbg" style="position: absolute; box-shadow: 0 0 15px 11px black; right: 0px; top: 0px;">' + '<div class="posy" id="posyt" style= color: rgb(250, 250, 250); text-align: center; line-height: 42px; vertical-align: middle; width: auto; height: auto; border-radius: 21px; padding: 6px;">' +
        '<div id="minimap-text" style="display: none;"></div>' +
        '<div id="minimap-box" style="position: relative;width:300px;height:300px">' +
        '<canvas id="minimap" style="width: 100%; height: 100%;z-index:1;position:absolute;top:0;left:0;"></canvas>' +
        '<canvas id="minimap-board" style="width: 100%; height: 100%;z-index:2;position:absolute;top:0;left:0;"></canvas>' +
        '<canvas id="minimap-cursor" style="width: 100%; height: 100%;z-index:3;position:absolute;top:0;left:0;"></canvas>' +
        '</div><div id="minimap-config" style="line-height:20px; background-color:#080808;">' +
        '<span id="hide-map" style="cursor:pointer;">Скрыть' +
        '</span> | <span id="follow-mouse" style="cursor:pointer;"Follow mous' +
        '</span> | Zoom: <span id="zoom-plus" style="cursor:pointer;font-weight:bold;">+</span> / ' +
        '<span id="zoom-minus" style="cursor:pointer;font-weight:bold;">-</span>' +
        '</div>' +
        '</div>';
    document.body.appendChild(div);
    minimap = document.getElementById("minimap");
    minimap_board = document.getElementById("minimap-board");
    minimap_cursor = document.getElementById("minimap-cursor");
    minimap.width = minimap.offsetWidth;
    minimap_board.width = minimap_board.offsetWidth;
    minimap_cursor.width = minimap_cursor.offsetWidth;
    minimap.height = minimap.offsetHeight;
    minimap_board.height = minimap_board.offsetHeight;
    minimap_cursor.height = minimap_cursor.offsetHeight;
    ctx_minimap = minimap.getContext("2d");
    ctx_minimap_board = minimap_board.getContext("2d");
    ctx_minimap_cursor = minimap_cursor.getContext("2d");

    //No Antialiasing when scaling!
    ctx_minimap.mozImageSmoothingEnabled = false;
    ctx_minimap.webkitImageSmoothingEnabled = false;
    ctx_minimap.msImageSmoothingEnabled = false;
    ctx_minimap.imageSmoothingEnabled = false;

    drawBoard();
    drawCursor();

    document.getElementById("hide-map").onclick = function() {
        console.log("This should do something, but it doesn 't");
            toggle_show = false; document.getElementById("minimap-box").style.display = "none"; document.getElementById("minimap-config").style.display = "none"; document.getElementById("minimap-text").style.display = "block"; document.getElementById("minimap-text").innerHTML = "Показать"; document.getElementById("minimap-text").style.cursor = "pointer";
        };
        document.getElementById("minimap-text").onclick = function() {
            toggle_show = true;
            document.getElementById("minimap-box").style.display = "block";
            document.getElementById("minimap-config").style.display = "block";
            document.getElementById("minimap-text").style.display = "none";
            document.getElementById("minimap-text").style.cursor = "default";
            loadTemplates();
        };
        document.getElementById("zoom-plus").addEventListener('mousedown', function(e) {
            e.preventDefault();
            zooming_in = true;
            zooming_out = false;
            zoomIn();
            console.log("+");
            console.log(zooming_in);
            console.log(zooming_out);
        }, false);
        document.getElementById("zoom-minus").addEventListener('mousedown', function(e) {
            e.preventDefault();
            zooming_out = true;
            zooming_in = false;
            zoomOut();
            console.log("-");
        }, false);
        document.getElementById("zoom-plus").addEventListener('mouseup', function(e) {
            zooming_in = false;
        }, false);
        document.getElementById("zoom-minus").addEventListener('mouseup', function(e) {
            zooming_out = false;
        }, false);
        document.getElementById("follow-mouse").onclick = function() {
            /* toggle_follow = !toggle_follow;
            if (toggle_follow) {
            this.innerHTML = "Fareyi Takip Et";
            loadTemplates();
            x_window = x;
            y_window = y;
            drawCursor();
            } else {
            this.innerHTML = "Ekran? Takip Et";
            getCenter();
            } */
        };

        gameWindow = document.getElementById("canvas");
        gameWindow.addEventListener('mouseup', function(evt) {
            if (!toggle_show)
                return;
            if (!toggle_follow)
                setTimeout(getCenter, 50);
        }, false);

        gameWindow.addEventListener('mousemove', function(evt) {
            if (!toggle_show)
                return;
            coorDOM = document.getElementById("coordinatesNote");
            coordsXY = coorDOM.innerHTML.split(/(\d+)/)
            //console.log(coordsXY);

            x_new = +(coordsXY[0].substring(2) + coordsXY[1]);
            y_new = +(coordsXY[2].substring(3) + coordsXY[3]);
            //console.log({x_new,y_new});

            if (x != x_new || y != y_new) {
                x = parseInt(x_new);
                y = parseInt(y_new);
                if (toggle_follow) {
                    x_window = x;
                    y_window = y;
                } else drawCursor();

                loadTemplates();

                //EN
                for(let name in template_list){
                	let temp = template_list[name];
                	if(x.between(temp.x,temp.x+temp.width) && y.between(temp.y,temp.y+temp.height)){
                		let c = x-temp.x + image_list[name].width*(y-temp.y) << 2;
                		if(image_list[name].data[c+3]!==255) break;
                		let rgb = [image_list[name].data[c],image_list[name].data[c+1],image_list[name].data[c+2]],
                			clr = document.getElementById('colorSampleSelector').parentNode.style.backgroundColor.match(/-?\d+/g);
                		if(rgb[0]==clr[0] && rgb[1]==clr[1] && rgb[2]==clr[2]) break;
                		for(let e of document.getElementsByClassName('palette-color-box')){
                			clr = e.style.backgroundColor.match(/-?\d+/g);
                			if(rgb[0]==clr[0] && rgb[1]==clr[1] && rgb[2]==clr[2]){e.click();break};
                		};
                		break;
                	};
                };
                //>------------
            }
        }, false);

        updateloop();

        function updateloop() {

            console.log("Updating Template List");
            // Get JSON of available templates
            var xmlhttp = new XMLHttpRequest();
            var url = window.baseTepmlateUrl + "templates/data.json?" + new Date().getTime();
            xmlhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    template_list = JSON.parse(this.responseText);
                    if (!toggle_follow)
                        getCenter();
                }
            };
            xmlhttp.open("GET", url, true);
            xmlhttp.send();

            console.log("Refresh got forced.");
            image_list = [];
            loadTemplates();

            setTimeout(updateloop, 60000)
        }

        function toggleShow() {
            toggle_show = !toggle_show;
            if (toggle_show) {
                document.getElementById("minimap-box").style.display = "block";
                document.getElementById("minimap-config").style.display = "block";
                document.getElementById("minimap-text").style.display = "none";
                document.getElementByI

                d("minimapbg").onclick = function() {};
                loadTemplates();
            } else {
                document.getElementById("minimap-box").style.display = "none";
                document.getElementById("minimap-config").style.display = "none";
                document.getElementById("minimap-text").style.display = "block";
                document.getElementById("minimap-text").innerHTML = "Show Minimap";
                document.getElementById("minimapbg").onclick = function() {
                    toggleShow()
                };
            }
        }

        function zoomIn() {
            if (!zooming_in)
                return;
            zoomlevel = zoomlevel * 1.1;
            if (zoomlevel > 45) {
                zoomlevel = 45;
                return;
            }
            drawBoard();
            drawCursor();
            loadTemplates();
            setTimeout(zoomIn, zoom_time);
            console.log("zoomIn()");
        }

        function zoomOut() {
            if (!zooming_out)
                return;
            zoomlevel = zoomlevel / 1.1;
            if (zoomlevel < 1) {
                zoomlevel = 1;
                return;
            }
            drawBoard();
            drawCursor();
            loadTemplates();
            setTimeout(zoomOut, zoom_time);
            console.log("zoomOut()");
        }

        function loadTemplates() {
            if (!toggle_show)
                return;
            if (template_list == null)
                return;

            var x_left = x_window * 1 - minimap.width / zoomlevel / 2;
            var x_right = x_window * 1 + minimap.width / zoomlevel / 2;
            var y_top = y_window * 1 - minimap.height / zoomlevel / 2;
            var y_bottom = y_window * 1 + minimap.height / zoomlevel / 2;
            /*
            console.log("x_left : " + x_left);
            console.log("x_right : " + x_right);
            console.log("y_top : " + y_top);
            console.log("y_bottom : " + y_bottom);
            console.log(template_list);
            */
            var keys = [];
            for (var k in template_list) keys.push(k);
            needed_templates = [];
            var i;
            for (i = 0; i < keys.length; i++) {
                template = keys[i];

                var temp_x = parseInt(template_list[template]["x"]) * 1;
                var temp_y = parseInt(template_list[template]["y"]) * 1;
                var temp_xr = parseInt(template_list[template]["x"]) + parseInt(template_list[template]["width"]);
                var temp_yb = parseInt(template_list[template]["y"]) + parseInt(template_list[template]["height"]);
                // if (temp_xr <= x_left || temp_yb <= y_top || temp_x >= x_right || temp_y >= y_bottom)
                // continue
                if (!x_window.between(temp_x - range * 1, temp_xr + range * 1))
                    continue
                if (!y_window.between(temp_y - range * 1, temp_yb + range * 1))
                    continue
                //console.log("Template " + template + " is in range!");
                //console.log(x_window, y_window);
                needed_templates.push(template);
            }
            if (needed_templates.length == 0) {
                if (zooming_in == false && zooming_out == false) {
                    document.getElementById("minimap-box").style.display = "none";
                    document.getElementById("minimap-text").style.display = "block";
                    document.getElementById("minimap-text").innerHTML = "здесь ничего нету";
                }
            } else {
                document.getElementById("minimap-box").style.display = "block";
                document.getElementById("minimap-text").style.display = "none";
                counter = 0;
                for (i = 0; i < needed_templates.length; i++) {
                    if (image_list[needed_templates[i]] == null) {
                        loadImage(needed_templates[i]);
                    } else {
                        counter += 1;
                        //if last needed image loaded, start drawing
                        if (counter == needed_templates.length)
                            drawTemplates();
                    }
                }
            }
        }

        function loadImage(name) {
            console.log(" Load image " + name);
            image_list[name] = new Image();
            image_list[name].crossOrigin = '';//EN

            if (cachebreaker != null) image_list[name].src = window.baseTepmlateUrl + "images/" + template_list[name].name;
            else image_list[name].src = window.baseTepmlateUrl + "images/" + template_list[name].name;

            image_list[name].onload = function() {
                counter += 1;

                //EN
                console.log('loaded');
                let c = document.createElement('canvas'),
                	ctx = c.getContext('2d');
                c.width = image_list[name].width;c.height = image_list[name].height;
                ctx.drawImage(image_list[name],0,0,image_list[name].width,image_list[name].height);
                image_list[name] = c;
                image_list[name].ctx = ctx;
                image_list[name].data = ctx.getImageData(0,0,c.width,c.height).data;
                //>---------------

                //if last needed image loaded, start drawing

                if (counter == needed_templates.length)
                    drawTemplates();
            }
        }

        function drawTemplates() {
            ctx_minimap.clearRect(0, 0, minimap.width, minimap.height);
            var x_left = x_window * 1 - minimap.width / zoomlevel / 2;
            var y_top = y_window * 1 - minimap.height / zoomlevel / 2;
            var i;
            for (i = 0; i < needed_templates.length; i++) {
                var template = needed_templates[i];
                var xoff = (template_list[template]["x"] * 1 - x_left * 1) * zoomlevel;
                var yoff = (template_list[template]["y"] * 1 - y_top * 1) * zoomlevel;
                var newwidth = zoomlevel * image_list[template].width;
                var newheight = zoomlevel * image_list[template].height;
                var img = image_list[template];
                ctx_minimap.drawImage(img, xoff, yoff, newwidth, newheight);
                //console.log("Drawn!");
            }
        }

        function drawBoard() {
            ctx_minimap_board.clearRect(0, 0, minimap_board.width, minimap_board.height);
            if (zoomlevel <= 4.6)
                return;
            ctx_minimap_board.beginPath();
            var bw = minimap_board.width + zoomlevel;
            var bh = minimap_board.height + zoomlevel;
            var xoff_m = (minimap.width / 2) % zoomlevel - zoomlevel;
            var yoff_m = (minimap.height / 2) % zoomlevel - zoomlevel;
            var z = 1 * zoomlevel;

            for (var x = 0; x <= bw; x += z) {
                ctx_minimap_board.moveTo(x + xoff_m, yoff_m);
                ctx_minimap_board.lineTo(x + xoff_m, bh + yoff_m);
            }

            for (var x = 0; x <= bh; x += z) {
                ctx_minimap_board.moveTo(xoff_m, x + yoff_m);
                ctx_minimap_board.lineTo(bw + xoff_m, x + yoff_m);
            }
            ctx_minimap_board.strokeStyle = "black";
            ctx_minimap_board.stroke();
        }

        function drawCursor() {
            var x_left = x_window * 1 - minimap.width / zoomlevel / 2;
            var x_right = x_window * 1 + minimap.width / zoomlevel / 2;
            var y_top = y_window * 1 - minimap.height / zoomlevel / 2;
            var y_bottom = y_window * 1 + minimap.height / zoomlevel / 2;
            ctx_minimap_cursor.clearRect(0, 0, minimap_cursor.width, minimap_cursor.height);
            if (x < x_left || x > x_right || y < y_top || y > y_bottom)
                return
            xoff_c = x - x_left;
            yoff_c = y - y_top;

            ctx_minimap_cursor.beginPath();
            ctx_minimap_cursor.lineWidth = zoomlevel / 3;
            ctx_minimap_cursor.strokeStyle = "red";
            ctx_minimap_cursor.rect(zoomlevel * xoff_c, zoomlevel * yoff_c, zoomlevel, zoomlevel);
            ctx_minimap_cursor.stroke();

        }

        function getCenter() {
            var url = window.location.href;
            x_window = url.replace(re, '$2');
            y_window = url.replace(re, '$3');
            if (x_window == url || y_window == url) {
                x_window = 0;
                y_window = 0;
            }
            loadTemplates();
        }

        function findCoor() {
            //all elements with style attributes
            var elms = document.querySelectorAll("*[style]");
            // Loop and find the element with the right style attributes
            /*Array.prototype.forEach.call(elms, function (elm) {
            var style = elm.style.cssText;
            if (style == "position: absolute; left: 1em; bottom: 1em;") {
            console.log("Found It!");
            coorDOM = elm.firstChild;
            console.log(coorDOM.innerHTML);
            }
            });*/
            coorDOM = document.getElementById("coords");
        }
    }
