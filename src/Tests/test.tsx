import { FlowComponent, FlowObjectDataArray} from 'flow-component-model';
import * as React from 'react';
import { CSSProperties } from 'react';
import { clearInterval } from 'timers';
import { eActivityState, eDelayState, eDotPosition, eInactivityState, eRunState } from '../enums';
import { Result, Results } from '../results';
import Dot from './dot';
import OverlayButton from './OverlayButton';
import './test.css';
import TestHeader from './testheader';
import TestOverlay from './testoverlay';
import { FCMModal } from 'fcmkit';
import { FCMModalButton } from 'fcmkit/lib/ModalDialog/FCMModalButton';


declare const manywho: any;


export default class Test extends FlowComponent {
    
    header: TestHeader;
    headerElement: any;
    overlay: TestOverlay;
    overlayElement: any;
    dot: Dot;
    dotElement: any;

    runState: eRunState = eRunState.stopped;
    activityState: eActivityState = eActivityState.none;
    countdownState: eDelayState = eDelayState.none;
    autoStart: boolean = false;
    numRounds: number = 10;
    roundNumber: number = 0;
    countdownRemaining: number = 0;
    roundStart: number;
    roundEnd: number;
    countdownSeconds: number = 5;
    intervalSeconds: number = 5;
    responseSeconds: number = 30;
    responseDone: boolean = false;
    inactivityTimeoutSeconds: number = -1;
    inactivityRemaining: number = 5;
    inactivityState: eInactivityState = eInactivityState.none;
    inactivityCallback: any;
    inactivityTimer: any;
    displayProgressMessage: string = "";
  
    xPos: number = 0;
    yPos: number = 0;
    lastx: number;
    lasty: number;
    

    div: HTMLDivElement;

    previousContent: any;

    results: Results;

    startLabel: string;
    
    accuracy: number;

    buttons: Map<eRunState,any> = new Map();

    messageBox: FCMModal;

    submitted: boolean = false;

    testStartedTime: number;
    testPausedTime: number;
    testEndedTime: number;
    round: number = 0;
    roundStartedTime: number;

    waitingClick: boolean = false;
    maxResults: number = 0;
    maxDuration: number = 0;
    elapsedTime: number = 0;
    elapsedTimer: any;


    constructor(props: any) {
        super(props);
        this.randomPos = this.randomPos.bind(this);
        this.randomNine = this.randomNine.bind(this);
        this.centerPos = this.centerPos.bind(this);
        this.startTest = this.startTest.bind(this);
        this.startRound = this.startRound.bind(this);
        this.dotClicked = this.dotClicked.bind(this);

        this.watchInactivity = this.watchInactivity.bind(this);
        this.unwatchInactivity = this.unwatchInactivity.bind(this);
        this.inactivityPing = this.inactivityPing.bind(this);

        this.submit = this.submit.bind(this);
        this.cancelTest = this.cancelTest.bind(this);
        this.ignoreTimeout = this.ignoreTimeout.bind(this);

        //this.getClick = this.getClick.bind(this);
        this.getScore = this.getScore.bind(this);
        this.startElapseTimer = this.startElapseTimer.bind(this);
        this.stopElapseTimer = this.stopElapseTimer.bind(this);
        this.elapsed = this.elapsed.bind(this);
    
        //this.numRounds = parseInt(this.getAttribute("numRounds","1"));
        this.countdownSeconds = parseInt(this.getAttribute("countdownSeconds","4"));
        this.intervalSeconds = parseInt(this.getAttribute("intervalSeconds","0"));
        this.responseSeconds = parseInt(this.getAttribute("responseSeconds","-1"));
        this.startLabel = this.getAttribute("startLabel","Begin");
        this.autoStart = this.getAttribute("autoStart","false").toLowerCase() === "true";
        this.results = new Results(this.getAttribute("resultTypeName","TestResult"));
        this.displayProgressMessage = this.getAttribute("progressLabel","");
        this.inactivityTimeoutSeconds = parseInt(this.getAttribute("inactivitySeconds","-1"));

        this.buttons.set(
            eRunState.stopped,
            (
                <OverlayButton 
                    label={this.getAttribute("startLabel","Begin")}
                    callback={this.startTest}
                />
            )
        );
        this.buttons.set(
            eRunState.complete,
            (
                <OverlayButton 
                    label={this.getAttribute("submitLabel","Submit")}
                    callback={this.submitTest}
                />
            )
        );

    }

    async componentWillUnmount(): Promise<void> {
        (manywho as any).eventManager.removeDoneListener(this.componentId);
    }

    shouldComponentUpdate(nextprops: any, nextstate: any){
        return true;
    }

    moveHappened(xhr: XMLHttpRequest, request: any) {
        if ((xhr as any).invokeType === 'FORWARD') {
            // this.forceUpdate();
        }
    }

     async componentDidMount(){
        await super.componentDidMount();   
        (manywho as any).eventManager.addDoneListener(this.moveHappened, this.componentId);
        this.headerElement = (
            <TestHeader 
                root={this}
                ref={(element: TestHeader) => {this.header=element}}
            />
        );
        this.overlayElement = (
            <TestOverlay 
                root={this}
                ref={(element: TestOverlay) => {this.overlay=element}}
            />
        );
        this.dotElement = (
            <Dot 
                root={this}
                ref={(element: Dot) => {this.dot=element}}
            />
        );

        if(this.autoStart === true){
            this.startTest(undefined,undefined,undefined);
        }
        else {
            this.forceUpdate();
        }
    }

    //generic page refresh
    refreshInfo() {
        this.overlay?.forceUpdate();
        this.header?.forceUpdate();
        this.dot?.forceUpdate();
    }

    // calculates a random dot position
    randomPos() {
        if(this.div) {
            let rect: DOMRect = this.div.getBoundingClientRect();
            let xOffset: number = Math.floor((Math.random() * 80)+ 10);
            let yOffset: number = Math.floor((Math.random() * 80)+ 10);

            this.xPos = ( ((rect.width / 100) * xOffset)); //- 120; //(this.dotElement.width / 2) ;
            this.yPos = ( ((rect.height / 100) * yOffset)); //- 120; //(this.dotElement.height / 2);

            let outerPxWidth: number = this.convertRemToPixels(15);
            this.xPos = this.xPos - (outerPxWidth / 2)
            this.yPos = this.yPos - (outerPxWidth / 2)

            //this.xPos -= 120;
            //this.yPos -= 120;
        }
    }

    randomNine() {
        if(this.div) {
            let rect: DOMRect = this.div.getBoundingClientRect();
            
            let row: number = Math.floor((Math.random() * 3)+ 1);
            while(row === this.lasty) {
                row = Math.floor((Math.random() * 3)+ 1);
            }
            this.lasty = row;
            
            let col: number = Math.floor((Math.random() * 3)+ 1);
            while(col === this.lastx) {
                col = Math.floor((Math.random() * 3)+ 1);
            }
            this.lastx = col;
            this.xPos = ( ((rect.width / 4) * col)); //- 120; //(this.dotElement.width / 2) ;
            this.yPos = ( ((rect.height / 4) * row)); //- 120; //(this.dotElement.height / 2);

            let outerPxWidth: number = this.convertRemToPixels(15);
            this.xPos = this.xPos - (outerPxWidth / 2)
            this.yPos = this.yPos - (outerPxWidth / 2)

        }
    }

    // calculates the page center dot position
    centerPos() {
        if(this.div) {
            let rect: DOMRect = this.div.getBoundingClientRect();
            let left: number = (rect.width / 2);
            let top: number = (rect.height / 2);
            let outerPxWidth: number = this.convertRemToPixels(15);
            this.xPos = left - (outerPxWidth / 2)
            this.yPos = top - (outerPxWidth / 2)
        }
    }

    convertRemToPixels(rem: number) : number {    
        return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }

    // start a test with specified num rounds, duration in seconds and dot behavior
    // a test will run until either the max results are captured, the time runs out or the this.submitted flag is set.
    async startTest(maxResults: number, maxDuration: number, dotMode: eDotPosition) {
        this.forceUpdate();
        this.results.clear();
        this.runState = eRunState.starting;
        this.maxResults = maxResults;
        this.maxDuration = maxDuration* 1000; //convert to ms
        this.roundNumber = 0;
        this.submitted = false;
        this.refreshInfo();
        await this.countDown(this.countdownSeconds);
        this.runState = eRunState.running;
        this.refreshInfo();
        this.testStartedTime = new Date().getTime();
        if(this.maxDuration > 0) {
            this.startElapseTimer();
        }
        
        while(
            (this.maxResults > 0 ? this.roundNumber <= this.maxResults : true ) && 
            (this.maxDuration > 0 ? this.elapsedTime <= this.maxDuration : true ) && 
            this.submitted===false
        ) {
            this.roundNumber++;
            await this.countDown(this.intervalSeconds);
            await this.startRound(dotMode);
        }

        if(this.maxResults > 0 && this.roundNumber >= this.maxResults) {
            console.log("Hit max clicks limit of " + this.maxResults);
        }
        if(this.elapsedTimer) {
            this.stopElapseTimer();
        }
        this.unwatchInactivity();
        this.runState = eRunState.complete;
        this.refreshInfo();
        // test complete
        //if no results make a single fail one
        if(this.results.items.size === 0) {
            this.results.add(Result.newInstance(1, 0, 0, 0, 0,"",""));
        }
        let results: FlowObjectDataArray = this.results.makeFlowObjectData();
        console.log(JSON.stringify(results));
        this.setStateValue(results);
        if(this.outcomes["OnComplete"]) {
            await this.triggerOutcome("OnComplete");
        }
    }

    // a single round will display a dot and wait for it to be clicked
    async startRound(dotMode: eDotPosition) {
        
        this.activityState = eActivityState.answering;
        
        // position dot
        switch(dotMode) {
            case eDotPosition.random:
                this.randomPos();
                break;
            case eDotPosition.random9:
                this.randomNine();
                break;
            case eDotPosition.center:
                this.centerPos();
                break;
        }

        this.refreshInfo();
        this.roundStartedTime = new Date().getTime();
        
        if(this.inactivityTimeoutSeconds>0) {
            this.watchInactivity(this.inactivityTimeoutSeconds, this.inactiveTimeout)
        }

        // allow time for answers
        this.waitingClick=true;
        while(
            this.waitingClick===true && 
            this.submitted===false && 
            (this.maxDuration > 0 ? this.elapsedTime <= this.maxDuration  : true )
        ) {
            this.refreshInfo();
            await this.sleep(100);
        }

        this.unwatchInactivity();

        this.refreshInfo();
    }

    startElapseTimer() {
        if(this.elapsedTimer) {
            clearInterval(this.elapsedTimer);
            this.elapsedTimer = undefined;
        }
        this.elapsedTimer = window.setInterval(this.elapsed , 500);
    }

    stopElapseTimer() {
        if(this.elapsedTimer) {
            window.clearInterval(this.elapsedTimer);
            this.elapsedTimer = undefined;
        }
    }

    //pings once per second to add on elapsed time of 500 ms
    elapsed() {
        this.elapsedTime += 500; // new Date().getTime() - this.testStartedTime;
        console.log(this.elapsedTime);
    }

    // accuracy 0 is perfect
    dotClicked(accuracy: number, time: Date) {
        if(this.waitingClick===true) {
            this.unwatchInactivity();
            this.waitingClick=false;
            let score: Result = this.getScore(this.roundNumber, time.getTime() - this.roundStartedTime, accuracy);
            this.results.add(score);
        }
    }

    //stubs
    /*
    async getClick() : Promise<any>{
        this.activityState = eActivityState.answering;
        this.responseDone = false;
        //if(maxClicks && maxClicks > 0) {
        //    this.countdownRemaining=maxClicks;
        //}
        //else {
        //    this.countdownRemaining=-1;
        //}
        this.refreshInfo();

        while (this.countdownRemaining > 0 && this.submitted===false){
            this.refreshInfo();
            await this.sleep(100);
        }
        this.activityState = eActivityState.none;
        this.refreshInfo();
        return;
    }
*/
    async submitTest() {
        if(this.outcomes[this.getAttribute("submitOutcome", "OnSubmit")]) {
            await this.triggerOutcome(this.getAttribute("submitOutcome", "OnSubmit"));
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

    watchInactivity(numSeconds : number, callBack: any) {
        this.inactivityRemaining = numSeconds;
        this.inactivityState = eInactivityState.watching;
        this.inactivityCallback = callBack;
        this.inactivityTimer = setTimeout(this.inactivityPing,1000);
    }

    unwatchInactivity() {
        if(this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = undefined;
        }
        this.inactivityRemaining = -1;
        this.inactivityState = eInactivityState.none;
        this.inactivityCallback = undefined;
    }

    inactivityPing() {
        if(this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = undefined;
        }
        if(this.inactivityRemaining > 0 && this.inactivityState === eInactivityState.watching) {
                this.inactivityRemaining-=1;
                this.inactivityTimer = setTimeout(this.inactivityPing,1000);
        }
        else {
            if(this.inactivityState === eInactivityState.watching) {
                this.inactivityState = eInactivityState.none;
                if(this.inactivityCallback) {
                    this.inactivityCallback();
                }
            }
        }
    }

    stopTest() {
        this.countdownState = eDelayState.none;
        this.activityState = eActivityState.none;
        this.runState = eRunState.stopped;
        if(this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = undefined;
        }
        this.refreshInfo();
    }

    

    inactiveTimeout() {
        console.log("inactive !!!");
        // stop any countdown
        if(this.elapsedTimer) {
            this.stopElapseTimer();
            this.elapsedTime -= (this.inactivityTimeoutSeconds * 1000);
        }
        this.messageBox?.showDialog(
            null,
            this.getAttribute("timeoutTitle","Inactivity"),
            this.getAttribute("timeoutMessage","No activity detected"),
            [
                new FCMModalButton(this.getAttribute("timeoutContinueLabel","Continue"),this.ignoreTimeout), 
                new FCMModalButton(this.getAttribute("timeoutAbortLabel","Exit"),this.cancelTest)
            ]
        );
    }

    ignoreTimeout() {
        this.messageBox.hideDialog();
        //reset global timeout
        if(this.maxDuration > 0) {
           this.startElapseTimer();
        }
        if(this.inactivityTimeoutSeconds>0) {
            this.watchInactivity(this.inactivityTimeoutSeconds, this.inactiveTimeout)
        }
    }

    cancelTest() {
        this.unwatchInactivity();
        if(this.elapsedTimer) {
            clearInterval(this.elapsedTimer)
            this.elapsedTimer = undefined;
        }
        this.submitted=true; 
        this.messageBox.hideDialog();
    }

    submit() {
        this.unwatchInactivity();
        if(this.elapsedTimer) {
            clearInterval(this.elapsedTimer)
            this.elapsedTimer = undefined;
        }
        this.activityState = eActivityState.none;
        this.refreshInfo();
        console.log("complete pressed");
        this.submitted=true;
    }

    

    /*
    async getAnswers(maxTime?: number) : Promise<any> {
        return true;
    }
    */

    getScore(roundNumber: number, durationMilliseaconds: number, accuracy: number) : Result {
        let correct: number = 0;
        let incorrect: number = 0;
        this.activityState = eActivityState.results;
        this.refreshInfo();
        return Result.newInstance(roundNumber, 0, 0, durationMilliseaconds, accuracy,"","");
    }
    
    render() {
        const style: CSSProperties = {};
        style.width = '-webkit-fill-available';
        style.height = '-webkit-fill-available';

        if (this.model.visible === false) {
            style.display = 'none';
        }
        if (this.model.width) {
            style.width = this.model.width + 'px';
        }
        if (this.model.height) {
            style.height = this.model.height + 'px';
        }


        return (
            <div
                className="test"
                style={style}
                ref={(e: HTMLDivElement) => {this.div=e}}
            >
                <FCMModal 
                    ref={(element: FCMModal) => {this.messageBox=element}}
                />
                {this.overlayElement}
                <div
                    className="test-title"
                >
                   {this.headerElement} 
                </div>
                <div
                    className="test-body"
                >
                   {this.dotElement}
                </div>                
            </div>
        );
    }
}

