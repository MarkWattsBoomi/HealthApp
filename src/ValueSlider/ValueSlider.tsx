import { FlowComponent, FlowObjectData } from "flow-component-model";
import React = require("react");
import { Result, Results } from "../results";
import './valueslider.css';
declare const manywho: any;

export default class ValueSlider extends FlowComponent {
    options: Map<string,FlowObjectData> = new Map();
    selectedOption: string = "";
    canvas: HTMLCanvasElement;
    pointer: HTMLDivElement;
    currentValue: number;
    dragging: boolean = false;
    topMargin: number = 10;
    bottomMargin: number = 10;
    leftMargin: number = 30;
    rightMargin: number = 30;
    results: Results;

    
    constructor(props: any) {
        super(props);
        this.setCanvas = this.setCanvas.bind(this);
        this.drawScale = this.drawScale.bind(this);
        this.positionPointer = this.positionPointer.bind(this);
        this.canvasClicked = this.canvasClicked.bind(this);
        this.dragStart = this.dragStart.bind(this);
        this.drag = this.drag.bind(this);
        this.dragEnd = this.dragEnd.bind(this);
        this.dragOut = this.dragOut.bind(this);

        this.touchStart = this.touchStart.bind(this);
        this.touchDrag = this.touchDrag.bind(this);
        this.touchEnd = this.touchEnd.bind(this);
        this.touchOut = this.touchOut.bind(this);
        this.touchClicked = this.touchClicked.bind(this);
        //this.currentValue = parseInt(this.getAttribute("step","10")) / 2;
        this.results = new Results(this.getAttribute("resultTypeName","TestResult"));
    }

    async componentDidMount(): Promise<void> {
        await super.componentDidMount();  
        let oldVal: number = this.getStateValue() as number;
        if(!oldVal) {
            oldVal = parseInt(this.getAttribute("step","10")) / 2;
        }
        else {
            oldVal = 100-oldVal;
        }
        await this.setValue(oldVal);
    }

    setCanvas(canvas: HTMLCanvasElement){
        if(canvas){
            this.canvas = canvas;
            this.drawScale();
        }
        else {
            this.canvas = undefined;
        }
    }

    setPointer(pointer: HTMLDivElement){
        if(pointer){
            this.pointer = pointer;
            this.positionPointer();
        }
        else {
            this.pointer = undefined;
        }
    }

    drawScale() {
        if(this.canvas){
            this.canvas.width=this.canvas.offsetWidth;
            this.canvas.height=this.canvas.offsetHeight;
            let pen:  CanvasRenderingContext2D = this.canvas.getContext("2d");  
            let width: number = this.canvas.width;
            let height: number = this.canvas.height;
            pen.clearRect(0, 0, width, height);
            let x: number = ((width-(this.leftMargin+this.rightMargin)) / 2) + this.leftMargin;
            let thickness: number = this.model.size || 2;
            let divisions: number = parseInt(this.getAttribute("step","10"));

            //first vertical
            pen.beginPath();    
            pen.lineWidth = thickness;
            pen.fillStyle = "rgb(0 0 0)";    
            pen.moveTo(x,this.topMargin);
            pen.lineTo(x,height - this.bottomMargin);
            pen.closePath(); 
            pen.stroke();   

            // top horizontal
            pen.beginPath();  
            pen.lineWidth = thickness;  
            pen.fillStyle = "rgb(0 0 0)";    
            pen.moveTo(this.leftMargin,this.topMargin);
            pen.lineTo(width-this.rightMargin,this.topMargin);
            pen.closePath(); 
            pen.stroke();
            pen.font = "16px Arial";
            pen.fillText(divisions + "",0, this.topMargin + 6);

            // bottom horizontal
            pen.beginPath();  
            pen.lineWidth = thickness;  
            pen.fillStyle = "rgb(0 0 0)";    
            pen.moveTo(this.leftMargin,height - this.bottomMargin);
            pen.lineTo(width-this.rightMargin,height - this.bottomMargin);
            pen.closePath(); 
            pen.stroke();
            pen.font = "16px Arial";
            pen.fillText("0",0, height - this.bottomMargin + 6);

            pen.font = "16px Arial";
            pen.fillText(divisions/2 + "",0, ((height - (this.bottomMargin + this.topMargin)) /2) + this.topMargin + 6);

            let divIncrement: number = divisions > 20? 20 : divisions;
            let divOffset: number = (height - (this.topMargin + this.bottomMargin)) / divIncrement;
            let left: number = x - ((width - (this.leftMargin + this.rightMargin)) * 0.4);
            let right: number = x + ((width - (this.leftMargin + this.rightMargin)) * 0.4);
            
            for(let divPos = 1 ; divPos< divIncrement ; divPos++) {
                let y: number = divPos * divOffset + this.topMargin;
                pen.beginPath();  
                pen.lineWidth = thickness/2;  
                pen.fillStyle = "rgb(0 0 0)";    
                pen.moveTo(left,y);
                pen.lineTo(right,y);
                pen.closePath(); 
                pen.stroke();
            }
            this.positionPointer();
        }
    }

    positionPointer() {
        if(this.canvas && this.pointer && this.currentValue){ 
            const rect = this.canvas.getBoundingClientRect();
            let width: number = this.canvas.width;
            let height: number = this.canvas.height;
            let vCenter: number = width / 2;
            let divisions: number = parseInt(this.getAttribute("step","10"));
            let divOffset: number = (height-(this.topMargin + this.bottomMargin)) / divisions;
            let y: number = (this.currentValue * divOffset) + this.topMargin; // - rect.top;

            this.pointer.style.left = (vCenter - 8) + "px";
            this.pointer.style.top = (y - 8) + "px";
            this.pointer.style.display = "unset";

        }
        else {
            if(this.pointer) {
                this.pointer.style.display = "none";
            }
        }
    }

    async canvasClicked(e: any) {
        const rect = this.canvas.getBoundingClientRect();
        let y: number = e.clientY - rect.top;
        let height: number = this.canvas.height;
        let pcDown: number = Math.round((y / height)*100); 
        let divisions: number = parseInt(this.getAttribute("step","10"));
        let newVal: number = Math.round(divisions * (pcDown / 100));
        await this.setValue(newVal);
    }

    async touchClicked(e: any) {
        const rect = this.canvas.getBoundingClientRect();
        let y: number = e.touches[0].clientY - rect.top;
        let height: number = this.canvas.height;
        let pcDown: number = Math.round((y / height)*100); 
        let divisions: number = parseInt(this.getAttribute("step","10"));
        let newVal: number = Math.round(divisions * (pcDown / 100));
        await this.setValue(newVal);
    }

    async setValue(newVal: number) {
        let divisions: number = parseInt(this.getAttribute("step","10"));
        if(newVal < 0) {newVal = 0}
        if(newVal > divisions) {newVal = divisions}
        this.currentValue = newVal;
        this.positionPointer();
        let result: Result;
        if(this.results.items.has(1)){
            result = this.results.items.get(1);
            result.result=""+(100 - newVal);
        }
        else {
            this.results.add(Result.newInstance(1,0,0,0,0,""+(100 - newVal),""));
        }
        let stateValue = this.results.makeFlowObjectData().items[0];
        await this.setStateValue(stateValue);

        if(this.outcomes?.OnSelect) {
            await this.triggerOutcome("OnSelect")
        }
        else {
           manywho.engine.sync(this.flowKey); 
        }
    }

    dragStart(e: any) {
        e.stopPropagation();
        e.preventDefault();
        this.dragging = true;
    }

    touchStart(e: any) {
        e.stopPropagation();
        e.preventDefault();
        this.dragging = true;
        console.log("touch start");
    }

    drag(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            let y: number = e.clientY - rect.top;
            if(y < 0) y=0;
            if(y > rect.height) y=rect.height;
            this.pointer.style.top = (y - 8) + "px";
        } 
    }

    touchDrag(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            let y: number = e.touches[0].clientY - rect.top;
            console.log("rt=" + rect.top + " dp=" + e.touches[0].clientY + " off=" + y);
            if(y < 0) y=0;
            if(y > rect.height) y=rect.height;
            this.pointer.style.top = (y - 8) + "px";
            console.log("touch draging");
        } 
    }

    dragEnd(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            this.dragging = false;
            this.canvasClicked(e);
        } 
    }

    touchEnd(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            this.dragging = false;
            this.touchClicked(e);
            console.log("touch drag end");
        } 
    }

    dragOut(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            this.dragging = false;
            this.canvasClicked(e);
        } 
    }

    touchOut(e: any) {
        if(this.dragging) {
            e.stopPropagation();
            e.preventDefault();
            this.dragging = false;
            this.canvasClicked(e);
            console.log("touch drag out");
        } 
    }

    render() {

        let mainStyle: React.CSSProperties = {};
        if(this.model.height && this.model.height > 0) {
            mainStyle.height = this.model.height + "px";
        }
        else {
            mainStyle.height = "webkit-fill-available";
        }
        if(this.model.width && this.model.width > 0) {
            mainStyle.width = this.model.width + "px";
        }
        else {
            mainStyle.width = "webkit-fill-available";
        }
        
        return (
            <div
                className="vslid"
                onMouseMove={this.drag}
                onTouchMove={this.touchDrag}
                onMouseUp={this.dragEnd}
                onTouchEnd={this.touchEnd}
                onMouseLeave={this.dragOut}
                onTouchCancel={this.touchOut}
                style={{touchAction:"none"}}
            >
                <div
                    className="vslid-left"
                >
                    <div
                        className="vslid-summary"
                    >
                        <span className="vslid-summary-label">YOUR</span>
                        <span className="vslid-summary-label">HEALTH</span>
                        <span className="vslid-summary-label">TODAY</span>
                        <span className="vslid-summary-value">{100 - this.currentValue}</span>
                        
                    </div>
                </div>
                <div
                    className="vslid-right"
                >
                    <div
                        className="vslid-top"
                    >
                        <span
                            className="vslid-scalemax"
                        >
                            Best
                        </span>
                    </div>
                    <div
                        className="vslid-canvas"
                    >
                        <canvas 
                            ref={(element: HTMLCanvasElement) => {this.setCanvas(element)}}
                            style={mainStyle}
                            onClick={this.canvasClicked}
                            
                        />
                        <div 
                            ref={(element: HTMLDivElement) => {this.setPointer(element)}}
                            className="vslid-pointer"
                            onMouseDown={this.dragStart}
                            onTouchStart={this.touchStart}
                        />
                    </div>
                    <div
                        className="vslid-bottom"
                    >
                        <span
                            className="vslid-scalemax"
                        >
                            Worst
                        </span>
                    </div>
                </div>
            </div>
        );
    }
}

manywho.component.register('ValueSlider', ValueSlider);