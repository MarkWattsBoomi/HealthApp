import React = require("react");
import { FlowComponent, FlowObjectDataArray } from 'flow-component-model';
import './memoryboxes.css';
import MemoryBox from './memorybox';
import { CSSProperties } from "react";
import MemoryBoxHeader from "./memoryboxheaders";
import MemoryBoxOverlay from "./memoryboxoverlay";
import MemoryBoxFooter from "./memoryboxfooter";
import { eActivityState, eDelayState, eRunState } from "../enums";
import { Result, Results } from "../results";


declare const manywho: any;


export default class MemoryBoxes extends FlowComponent {
    
    boxes: Map<number,MemoryBox>;
    hotBoxes: Array<number> = new Array();
    selectedBoxes: Array<number> = [];
    resultBoxes: Map<number,boolean>;
    boxRows: Array<any>;
    previousContent: any;
    header: MemoryBoxHeader;
    headerElement: any;
    overlay: MemoryBoxOverlay;
    overlayElement: any;
    footer: MemoryBoxFooter;
    footerElement: any;
    
    runState: eRunState = eRunState.stopped;
    activityState: eActivityState = eActivityState.none;
    countdownState: eDelayState = eDelayState.none

    numRounds: number = 10;
    roundNumber: number = 0;
    countdownRemaining: number = 0;
    roundStart: number;
    roundEnd: number;
    countdownSeconds: number = 5;
    scoreSeconds: number = 5;
    flashSeconds: number = 3;
    responseSeconds: number = 30;
    responseDone: boolean = false;
    numBlocks: number = 3;
    incrementBlockCount: boolean = false;

    results: Results;

    startLabel: string;

    setBox(key: number, face: MemoryBox){
        if(face) {
            this.boxes.set(key,face);
        }
        else {
            if(this.boxes.has(key)){
                this.boxes.delete(key);
            }
        }
    }

    toggleSelected(boxid: number) {
        if(this.selectedBoxes.indexOf(boxid) >= 0){
            this.selectedBoxes.splice(this.selectedBoxes.indexOf(boxid),1);
        }
        else {
            this.selectedBoxes.push(boxid);
        }

    }

    shouldComponentUpdate(nextprops: any, nextstate: any){
        return true;
    }

    

    constructor(props: any){
        super(props);
        
        this.moveHappened = this.moveHappened.bind(this);
        this.buildBoxes = this.buildBoxes.bind(this);

        this.startTest = this.startTest.bind(this);
        this.countDown = this.countDown.bind(this);
        this.stopTest = this.stopTest.bind(this);
        this.startRound = this.startRound.bind(this);
        this.doneAnswering = this.doneAnswering.bind(this);
        this.getAnswers = this.getAnswers.bind(this);
        this.getScore = this.getScore.bind(this);

        this.randomizeBoxes = this.randomizeBoxes.bind(this);
        
        this.showHot = this.showHot.bind(this);

        this.numRounds = parseInt(this.getAttribute("numRounds","3"));
        this.numBlocks = parseInt(this.getAttribute("numBlocks","3"));
        this.incrementBlockCount = this.getAttribute("incrememtBlockCount","false").toLowerCase() === "true"
        this.countdownSeconds = parseInt(this.getAttribute("countdownSeconds","2"));
        this.flashSeconds = parseInt(this.getAttribute("flashSeconds","4"));
        this.scoreSeconds = parseInt(this.getAttribute("scoreSeconds","4"));
        this.responseSeconds = parseInt(this.getAttribute("responseSeconds","-1"));
        this.startLabel = this.getAttribute("startLabel","Begin");
        this.results = new Results(this.getAttribute("resultTypeName","TestResult"));

        
    }

    async componentDidMount(){
        await super.componentDidMount();   
        (manywho as any).eventManager.addDoneListener(this.moveHappened, this.componentId);
        this.headerElement = (
            <MemoryBoxHeader 
                root={this}
                ref={(element: MemoryBoxHeader) => {this.header=element}}
            />
        );
        this.overlayElement = (
            <MemoryBoxOverlay 
                root={this}
                ref={(element: MemoryBoxOverlay) => {this.overlay=element}}
            />
        );
        this.footerElement = (
            <MemoryBoxFooter 
                root={this}
                ref={(element: MemoryBoxFooter) => {this.footer=element}}
            />
        );
        this.buildBoxes();
        
    }

    async componentWillUnmount(): Promise<void> {
        (manywho as any).eventManager.removeDoneListener(this.componentId);
    }

    moveHappened(xhr: XMLHttpRequest, request: any) {
        if ((xhr as any).invokeType === 'FORWARD') {
            //this.buildFaces();
        }
    }
   
    buildBoxes() {
        this.boxes = new Map();
        this.boxRows = [];
        this.hotBoxes = [];
        for(let row = 1 ; row <= 3 ; row ++) {
            let colElements: Array<any> = [];
            for(let col = 1 ; col <= 3 ; col ++) {
                colElements.push(
                    <MemoryBox
                        key={((row * 3)-3) + col}
                        box={((row * 3)-3) + col}
                        root={this}
                        ref={(element: MemoryBox) => {this.setBox(((row * 3)-3) + col,element)}}
                    />
                );
            }
            this.boxRows.push(
                <div
                    className="membox-row"
                >
                    {colElements}
                </div>
            );
        }
        this.forceUpdate();
    }

    refreshInfo() {
        this.overlay?.forceUpdate();
        this.header?.forceUpdate();
        this.footer?.forceUpdate();
        this.boxes?.forEach((box: MemoryBox) => {
            box.forceUpdate();
        });
    }

    async startTest() {
        this.results.clear();
        this.runState = eRunState.starting;
        this.roundNumber = 0;
        while(this.roundNumber < this.numRounds) {
            this.roundNumber++;
            await this.startRound();
        }
        // test complete
        let results: FlowObjectDataArray = this.results.makeFlowObjectData();
        console.log(JSON.stringify(results));
        this.setStateValue(results);
        if(this.outcomes["OnComplete"]) {
            await this.triggerOutcome("OnComplete");
        }
    }

    async sleep(milliseconds: number) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    async countDown(numSeconds : number) : Promise<any>{
        let localThis = this;
        this.countdownRemaining = numSeconds;
        this.countdownState = eDelayState.countdown;
        this.refreshInfo();

        return new Promise(async function (resolve,reject) {
            while(localThis.countdownRemaining > 1) {
                localThis.countdownRemaining-=1;
                localThis.refreshInfo();
                await localThis.sleep(1000);
            }
            localThis.countdownState = eDelayState.none;
            localThis.refreshInfo();
            resolve(undefined);
        });
    }


    stopTest() {
        this.countdownState = eDelayState.none;
        this.activityState = eActivityState.none;
        this.runState = eRunState.stopped;
        this.hotBoxes=[];
        this.refreshInfo();
        //this.header.forceUpdate();
    }

    async startRound() {
        
        this.countdownState = eDelayState.none;
        this.activityState = eActivityState.none;
        this.runState = eRunState.starting;
        this.selectedBoxes = [];
        this.resultBoxes = new Map();
        this.hotBoxes = [];
        this.refreshInfo();
        await this.countDown(this.countdownSeconds);

        this.runState = eRunState.running;
        this.refreshInfo();
        // randomise the hot boxes
        this.randomizeBoxes(this.numBlocks);

        // show hot boxes for flash period
        await this.showHot(this.flashSeconds);

        // start counting
        let roundStart = new Date().getTime();

        // allow time for answers
        await this.getAnswers(this.responseSeconds);

        // stop counting
        let roundEnd = new Date().getTime();

        let score: Result = await this.getScore(this.roundNumber, roundEnd-roundStart);
        if(score.incorrect === 0 && this.incrementBlockCount===true) {
            this.numBlocks++;
        }
        await this.countDown(this.scoreSeconds);
        this.results.add(score);

        this.runState=eRunState.stopped;
        this.refreshInfo();
    }

    randomizeBoxes(numBoxes: number) {
        //get 3 randoms between 0 & 8
        this.hotBoxes = new Array();
        while (this.hotBoxes.length<numBoxes) {
            let item: number = (Math.floor(Math.random()*8)+1);
            if(this.hotBoxes.indexOf(item) < 0) {
                this.hotBoxes.push(item);
            }
        }
    }

    async showHot(numSeconds: number) : Promise<any> {
        this.activityState = eActivityState.flashing;
        this.refreshInfo();
        await this.countDown(numSeconds);
        this.activityState = eActivityState.none;
        this.refreshInfo();
        return;
    }

    async getAnswers(maxTime?: number) : Promise<any> {
        this.activityState = eActivityState.answering;
        this.responseDone = false;
        if(maxTime && maxTime > 0) {
            this.countdownRemaining=maxTime;
        }
        else {
            this.countdownRemaining=-1;
        }
        this.refreshInfo();

        while (this.responseDone === false && this.countdownRemaining !== 0){
            if(this.countdownRemaining > 0) {
                this.countdownRemaining--;
            }
            this.refreshInfo();
            await this.sleep(1000);
        }
        //await this.countDown(numSeconds);
        this.activityState = eActivityState.none;
        this.refreshInfo();
        return;
    }

    async doneAnswering() {
        this.responseDone=true;
    }

    async getScore(roundNumber: number, durationMilliseaconds: number) : Promise<Result> {
        let correct: number = 0;
        let incorrect: number = 0;
        this.boxes.forEach((box: MemoryBox, key: number) => {
            if(this.hotBoxes.indexOf(key) >= 0) {
                if(this.selectedBoxes.indexOf(key) >= 0) {
                    this.resultBoxes.set(key,true);
                    correct++;
                }
                else {
                    this.resultBoxes.set(key,false);
                    incorrect++;
                }
            }
            else {
                if(this.selectedBoxes.indexOf(key) >= 0) {
                    this.resultBoxes.set(key,false);
                    incorrect++;
                }
                else {
                    this.resultBoxes.set(key,true);
                    correct++;
                }
            }
        });
        this.activityState = eActivityState.results;
        this.refreshInfo();
        return Result.newInstance(roundNumber, correct, incorrect, durationMilliseaconds,0,"",""+this.numBlocks);
    }

    render() {
        const style: CSSProperties = {};
        style.width = '-webkit-fill-available';
        style.height = '-webkit-fill-available';

        if (this.model.visible === false) {
            style.display = 'none';
        }
        if (this.model.width) {
            //style.width = this.model.width + 'px';
            //style.height = style.width;
        }
        if (this.model.height) {
            //style.height = this.model.height + 'px';
            //style.width = style.height;
        }

        return (
            <div 
                key="mbxs"
                className="membox"
                style={style}
            >
                <div
                    className="membox-title"
                >
                   {this.headerElement} 
                </div>
                <div
                    className="membox-body"
                >
                   {this.boxRows}
                   {this.overlayElement}
                </div>
                <div
                    className="membox-footer"
                >
                   {this.footerElement} 
                </div>
            </div>
        );

    }


}

manywho.component.register('MemoryBoxes', MemoryBoxes);
