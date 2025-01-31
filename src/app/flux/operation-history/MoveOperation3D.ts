import type ModelGroup from '../../models/ModelGroup';
import ThreeGroup from '../../models/ThreeGroup';
import Operation from './Operation';
import ThreeModel from '../../models/ThreeModel';

type Positon = {
    positionX: number,
    positionY: number,
    positionZ: number
}

type MoveOperationProp = {
    target: ThreeGroup | ThreeModel,
    from: Positon,
    to: Positon,
}

type MoveOperationState = MoveOperationProp & {
    modelGroup: ModelGroup,
}

export default class MoveOperation3D extends Operation<MoveOperationState> {
    constructor(state: MoveOperationProp) {
        super();
        this.state = {
            target: state.target,
            modelGroup: state.target.modelGroup,
            from: state.from,
            to: state.to,
        };
    }

    public redo() {
        const model = this.state.target;
        const modelGroup = this.state.modelGroup;

        modelGroup.unselectAllModels();
        modelGroup.addModelToSelectedGroup(model);
        this.exec(this.state.to);
    }

    public undo() {
        const model = this.state.target;
        const modelGroup = this.state.modelGroup;

        modelGroup.unselectAllModels();
        modelGroup.addModelToSelectedGroup(model);

        const current = modelGroup.getSelectedModelTransformationForPrinting();
        if (this.state.to.positionZ > 0 && current.positionZ < this.state.to.positionZ) {
            this.exec({
                ...this.state.from,
                positionZ: current.positionZ - this.state.to.positionZ
            });
        } else if (this.state.to.positionZ < 0 && current.positionZ > this.state.to.positionZ) {
            this.exec({
                ...this.state.from,
                positionZ: -this.state.to.positionZ + current.positionZ + this.state.from.positionZ
            });
        } else {
            this.exec(this.state.from);
        }
    }

    private exec({ positionX, positionY, positionZ }) {
        const model = this.state.target;
        const modelGroup = this.state.modelGroup;
        modelGroup.unselectAllModels();
        if (model instanceof ThreeModel && model.supportTag) {
            modelGroup.addModelToSelectedGroup(model);
            modelGroup.updateSelectedGroupTransformation({
                positionX, positionY, positionZ: 0
            });
            model.meshObject.parent.updateMatrix();
            modelGroup.unselectAllModels();
            model.onTransform();

            modelGroup.stickToPlateAndCheckOverstepped(model.target);
        } else {
            modelGroup.addModelToSelectedGroup(model);
            modelGroup.updateSelectedGroupTransformation({
                positionX, positionY, positionZ
            });

            modelGroup.unselectAllModels();
            model.onTransform();
            if (model instanceof ThreeGroup) {
                modelGroup.stickToPlateAndCheckOverstepped(model);
            }
            if (model.parent && model.parent instanceof ThreeGroup) {
                modelGroup.stickToPlateAndCheckOverstepped(model.parent);
                model.parent.computeBoundingBox();
            }
            modelGroup.updatePrimeTowerHeight();
        }
    }
}
