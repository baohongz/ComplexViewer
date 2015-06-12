//    	xiNET Interaction Viewer
//    	Copyright 2013 Rappsilber Laboratory
//
//    	This product includes software developed at
//    	the Rappsilber Laboratory (http://www.rappsilberlab.org/).
//		
//		Interactor.js		
//
//		authors: Colin Combe

"use strict";

var colorbrewer = require('../../../node_modules/colorbrewer/colorbrewer');//Josh - should path for this be ../../../vendor...?
var Config = require('../../controller/Config');

//josh - should these be moved to Config.js?
Interactor.LABELMAXLENGTH = 90; // maximal width reserved for protein-labels
Interactor.labelY = -5; //label Y offset, better if calc'd half height of label once rendered

function Interactor() {}

Interactor.prototype.addStoichiometryLabel = function(stoich) {
	if (this.labelSVG) {//complexes don't have labels (yet?)
		this.labelSVG.innerHTML =  this.labelSVG.innerHTML + ' ['+stoich+']';
	}
}

Interactor.prototype.mouseDown = function(evt) {
        this.controller.preventDefaultsAndStopPropagation(evt);//see MouseEvents.js
        //if a force layout exists then stop it
        if (this.controller.force) {
            this.controller.force.stop();
        }

        this.controller.dragElement = this;
        //~ if (evt.controllerKey === false) {
            this.controller.clearSelection();
            this.setSelected(true);
        //~ } else {
            //~ this.setSelected(!this.isSelected);
        //~ }
        //store start location
        var p = this.controller.getEventPoint(evt);
        this.controller.dragStart = this.controller.mouseToSVG(p.x, p.y);
        this.showData();
        return false;
};

Interactor.prototype.touchStart = function(evt) {
           this.controller.preventDefaultsAndStopPropagation(evt);//see MouseEvents.js
        //if a force layout exists then stop it
        if (this.controller.force !== undefined) {
            this.controller.force.stop();
        }
        this.controller.dragElement = this;
        //~ if (evt.controllerKey === false) {
            this.controller.clearSelection();
            this.setSelected(true);
        //~ } else {
            //~ this.setSelected(!this.isSelected);
        //~ }
        //store start location
        var p = this.controller.getTouchEventPoint(evt);
        this.controller.dragStart = this.controller.mouseToSVG(p.x, p.y);
        this.showData();
        return false;
};

Interactor.prototype.mouseOver = function(evt) {
        this.controller.preventDefaultsAndStopPropagation(evt);
        this.showHighlight(true);
        //~ this.controller.setTooltip(this.id);
        return false;
};

Interactor.prototype.mouseOut = function(evt) {
        this.controller.preventDefaultsAndStopPropagation(evt);
        this.showHighlight(false);
        this.controller.hideTooltip();
        return false;
};

Interactor.prototype.getBlobRadius = function() {
    return 15;
};


Interactor.prototype.showHighlight = function(show) {
    if (show === true) {
        //~ this.highlight.setAttribute("stroke", xiNET.highlightColour.toRGB());
        this.highlight.setAttribute("stroke-opacity", "1");
    } else {
		//~ if (this.isSelected == false) {
                this.highlight.setAttribute("stroke-opacity", "0");
        //~ }
        //~ this.highlight.setAttribute("stroke", xiNET.selectedColour.toRGB());
    }
};

Interactor.prototype.setSelected = function(select) {
    if (select && this.isSelected === false) {
        this.controller.selected.set(this.id, this);
        this.isSelected = true;
		this.highlight.setAttribute("stroke", Config.selectedColour);
		this.highlight.setAttribute("stroke-opacity", "1");
    }
    else if (select === false && this.isSelected === true) {
        this.controller.selected.remove(this.id);
        this.isSelected = false;
		this.highlight.setAttribute("stroke-opacity", "0");
		this.highlight.setAttribute("stroke", Config.highlightColour);
    }
};

Interactor.prototype.getPosition = function(){
	return [this.x, this.y];
}

// more accurately described as setting transform for top svg elements (sets scale also)
Interactor.prototype.setPosition = function(x, y) {
    this.x = x;
    this.y = y;
    if (this.form === 1){
		this.upperGroup.setAttribute("transform", "translate(" + this.x + " " + this.y + ")" 
				+ " scale(" + (this.controller.z) + ") " + "rotate(" + this.rotation + ")");
  } 
    else {
		this.upperGroup.setAttribute("transform", "translate(" + this.x + " " + this.y + ")" 
				+ " scale(" + (this.controller.z) + ") ");
	}
};

Interactor.prototype.getAggregateSelfLinkPath = function() {
	var intraR = this.getBlobRadius() + 7;
	var sectorSize = 45;
	var arcStart = Interactor.trig(intraR, 25 + sectorSize);
	var arcEnd = Interactor.trig(intraR, -25 + sectorSize);
	var cp1 = Interactor.trig(intraR, 40 + sectorSize);
	var cp2 = Interactor.trig(intraR, -40 + sectorSize);
	return 'M 0,0 ' 
		+ 'Q ' + cp1.x + ',' + -cp1.y + ' ' + arcStart.x + ',' + -arcStart.y
		+ ' A ' + intraR + ' ' + intraR + ' 0 0 1 ' + arcEnd.x + ',' + -arcEnd.y
		+ ' Q ' + cp2.x + ',' + -cp2.y + ' 0,0';
}

Interactor.rotatePointAboutPoint = function(p, o, theta) {
	theta = (theta / 360) * Math.PI * 2;//TODO: change theta arg to radians not degrees
	var rx = Math.cos(theta) * (p[0]-o[0]) - Math.sin(theta) * (p[1]-o[1]) + o[0];
	var ry = Math.sin(theta) * (p[0]-o[0]) + Math.cos(theta) * (p[1]-o[1]) + o[1];
	return [rx, ry];
}

Interactor.prototype.checkLinks = function() {
    function checkAll(linkMap){
		var links = linkMap.values();
		var c = links.length;
		for (var l = 0; l < c; l++) {
			links[l].check();
		}	
	}    
    checkAll(this.naryLinks);
    checkAll(this.binaryLinks);
    checkAll(this.sequenceLinks);
    if (this.selfLink !== null) {
		this.selfLink.check();
	}
}

// update all lines (e.g after a move)
Interactor.prototype.setAllLinkCoordinates = function() {
    var links = this.naryLinks.values();
    var c = links.length;
    for (var l = 0; l < c; l++) {
		links[l].setLinkCoordinates();
    }    
    links = this.binaryLinks.values();
    c = links.length;
    for (var l = 0; l < c; l++) {
        var link = links[l];
        link.setLinkCoordinates();
    }
    if (this.selfLink) {
		this.selfLink.setLinkCoordinates(); 
	}
	links = this.sequenceLinks.values();
	c = links.length;
	for (var l = 0; l < c; l++) {
		links[l].setLinkCoordinates();
	}    
};

//todo: some tidying with regards whats in Interactor, whats in Polymer and whats in Gene,Protein, etc
Interactor.prototype.clearPositionalFeatures = function(posFeats) {
    this.annotations = [];   
    if (this.annotationsSvgGroup) this.controller.emptyElement(this.annotationsSvgGroup);
}

//todo: some tidying with regards whats in Interactor, whats in Polymer and whats in Gene,Protein, etc
Interactor.prototype.setPositionalFeatures = function(posFeats) {
    if (posFeats !== undefined && posFeats !== null) {
        var y = -Interactor.STICKHEIGHT / 2;
        //draw longest regions first
        posFeats.sort(function(a, b) {
            return (b.end - b.start) - (a.end - a.start);
        });     
        this.annotations = posFeats;
        for (var i = 0; i < posFeats.length; i++) {
            var anno = posFeats[i];
            anno.start = anno.start - 0;
            anno.end = anno.end - 0;
            anno.pieSlice = document.createElementNS(Config.svgns, "path");
            if (this.form === 0) {
                anno.pieSlice.setAttribute("d", this.getAnnotationPieSliceArcPath(anno));
            } else {
                anno.pieSlice.setAttribute("d", this.getAnnotationRectPath(anno));
            }
            anno.pieSlice.setAttribute("stroke-width", 1);
            anno.pieSlice.setAttribute("fill-opacity", "0.7");                 
            var text = anno.name + " [" + anno.start + " - " + anno.end + "]";
            anno.pieSlice.name = text;
            var xlv = this.controller;
            var self = this;
            anno.pieSlice.onmouseover = function(evt) {
				var el = (evt.target.correspondingUseElement) ? evt.target.correspondingUseElement : evt.target;
                xlv.preventDefaultsAndStopPropagation(evt);
                xlv.setTooltip(el.name, el.getAttribute('fill'));
                self.showHighlight(true);
            };
             if (this.annotationsSvgGroup) { //hack
				 this.annotationsSvgGroup.appendChild(anno.pieSlice);
			 }
        }
    }
};

//TODO: remove this, use rotateAboutPoint instead
Interactor.trig = function(radius, angleDegrees) {
        //x = rx + radius * cos(theta) and y = ry + radius * sin(theta)
        var radians = (angleDegrees / 360) * Math.PI * 2;
        return {
            x: (radius * Math.cos(radians)),
            y: (radius * Math.sin(radians))
        };
};

Interactor.prototype.showData = function(evt) {
    if (document.getElementById('jsonHeading')) {	
		document.getElementById('jsonHeading').innerHTML = this.id;
	} 
    if (document.getElementById('json')) {	
		document.getElementById('json').innerHTML = 
			"<pre>" + JSON.stringify(this.json, null, ' ') + "</pre>";
	} 
}

Interactor.prototype.setForm = function(form, svgP) {
};

module.exports = Interactor;
