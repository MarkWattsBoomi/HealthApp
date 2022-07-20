import React = require("react");
import { eActivityState } from "../enums";
import MovingDotClicker from "./movingdotclicker";
import Test from "./test";

export default class Dot extends React.Component<any,any> {

    outer: HTMLDivElement;
    inner: HTMLDivElement;
    avg: number;

    constructor(props: any) {
        super(props);
        this.clicked = this.clicked.bind(this);
        this.unclicked = this.unclicked.bind(this);
    }

    clicked(e: any) {
        e.preventDefault();
        e.stopPropagation();

        let event: any = e.clientX? e : e.changedTouches[0];
        
        this.inner?.classList.add("test-dot-clicked");
        let rect: DOMRect = this.outer.getBoundingClientRect();
        let xCentre: number = rect.x + (rect.width / 2);
        let yCentre: number = rect.y + (rect.height / 2);

        let xAcc: number = event.clientX - xCentre;
        let yAcc: number = event.clientY - yCentre;
        this.avg = (xAcc + yAcc) / 2;
        let root: Test = this.props.root;

        
    }

    unclicked(e: any) {
        e.preventDefault();
        e.stopPropagation();
        this.inner?.classList.remove("test-dot-clicked");
        let root: Test = this.props.root;
        root.dotClicked(this.avg, new Date());
        this.avg = undefined;
    }

    render() {
        let root: Test = this.props.root;
        let style: React.CSSProperties = {};
        if(root.activityState === eActivityState.answering) {
            // root knows where center of box id
            if(root instanceof MovingDotClicker) {
                //root.randomPos();
            }
            else {
                root.centerPos();
            }
            //let outerPxWidth: number = root.convertRemToPixels(15);
            //let left: number = root.xPos - (outerPxWidth / 2)
            //let top: number = root.yPos - (outerPxWidth / 2)
            style.display="flex";
            style.left=root.xPos; //left; //root.xPos - (7.5rem);
            style.top=root.yPos; //top;
        }
        else {
            style.display="none";
        }
        
        //onTouchStart={this.clicked}
        return(
            <div
                className="test-dotout"
                onMouseDown={this.clicked}
                onMouseUp={this.unclicked}
                onTouchStart={this.clicked}
                onTouchEnd={this.unclicked}
                style={style}
                ref={(element: HTMLDivElement ) => {this.outer = element}}
            >
                <div
                    className="test-dot"
                    ref={(element: HTMLDivElement ) => {this.inner = element}}
                />
            </div>
            
        );
    }
}