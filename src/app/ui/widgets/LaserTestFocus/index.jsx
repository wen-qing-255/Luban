import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
// import Widget from '../../components/Widget';
import {
    WidgetState
    // SMSortableHandle
    // SMMinimizeButton,
    // SMDropdownButton
} from '../../components/SMWidget';
// import SvgIcon from '../../components/SvgIcon';
// import Anchor from '../../components/Anchor';
// import styles from '../styles.styl';
import TestFocus from './TestFocus';
import { MACHINE_HEAD_TYPE } from '../../../constants';


class LaserTestFocusWidget extends PureComponent {
    static propTypes = {
        headType: PropTypes.string,
        isConnected: PropTypes.bool.isRequired,
        workflowState: PropTypes.string
    };

    state = {
        showInstructions: false
    };

    actions = {
        showInstructions: () => {
            this.setState({ showInstructions: true });
        },
        hideInstructions: () => {
            this.setState({ showInstructions: false });
        }
    };

    constructor(props) {
        super(props);
        WidgetState.bind(this);
    }

    render() {
        const state = this.state;
        // const actions = this.actions;

        if (!this.props.isConnected || !(this.props.headType === MACHINE_HEAD_TYPE.LASER.value)) {
            return null;
        }

        return (
            <TestFocus
                isConnected={this.props.isConnected}
                workflowState={this.props.workflowState}
                showInstructions={state.showInstructions}
                actions={this.actions}
            />
        );
    }
}
const mapStateToProps = (state) => {
    const { headType, isConnected, workflowState } = state.machine;
    return {
        headType: headType,
        isConnected,
        workflowState
    };
};
export default connect(mapStateToProps)(LaserTestFocusWidget);
