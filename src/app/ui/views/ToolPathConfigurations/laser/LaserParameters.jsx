import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Select from '../../../components/Select';
import { TOOLPATH_TYPE_IMAGE, TOOLPATH_TYPE_VECTOR } from '../../../../constants';
import i18n from '../../../../lib/i18n';
import { TextInput } from '../../../components/Input';
import TipTrigger from '../../../components/TipTrigger';
import GcodeParameters from './GcodeParameters';

class LaserParameters extends PureComponent {
    static propTypes = {
        toolPath: PropTypes.object.isRequired,

        updateToolPath: PropTypes.func.isRequired,
        updateGcodeConfig: PropTypes.func.isRequired,

        multipleEngine: PropTypes.bool.isRequired
    };

    state = {
    };

    actions = {
        onChangeMovementMode: (options) => {
            if (options.value === 'greyscale-line') {
                this.props.updateGcodeConfig({
                    dwellTime: 42,
                    jogSpeed: 1500,
                    workSpeed: 500,
                    fixedPower: 50,
                    movementMode: options.value
                });
            } else if (options.value === 'greyscale-dot') {
                this.props.updateGcodeConfig({
                    dwellTime: 42,
                    jogSpeed: 1500,
                    workSpeed: 1500,
                    fixedPower: 30,
                    movementMode: options.value
                });
            }
        }
    };

    render() {
        const { toolPath, multipleEngine } = this.props;

        const { name, type, gcodeConfig, useLegacyEngine } = toolPath;

        const { direction, movementMode } = gcodeConfig;


        // eslint-disable-next-line no-unused-vars
        const isSVG = type === TOOLPATH_TYPE_VECTOR;
        const isImage = type === TOOLPATH_TYPE_IMAGE;

        return (
            <React.Fragment>
                <div className="sm-parameter-container">
                    <div className="sm-flex justify-space-between margin-bottom-8">
                        <span className="line-height-32">{i18n._('Name')}</span>
                        <TextInput
                            // className="sm-parameter-row__input-md"
                            // style={{ width: '160px' }}
                            size="large"
                            value={name}
                            onChange={(event) => { this.props.updateToolPath({ name: event.target.value }); }}
                        />
                    </div>
                    {multipleEngine && (
                        <div className="sm-parameter-row">
                            <span className="sm-parameter-row__label">{i18n._('Use legacy engine')}</span>
                            <input
                                type="checkbox"
                                className="sm-parameter-row__checkbox"
                                checked={useLegacyEngine}
                                onChange={() => { this.props.updateToolPath({ useLegacyEngine: !useLegacyEngine }); }}
                            />
                        </div>
                    )}
                    {isImage && (
                        <div>
                            <TipTrigger
                                title={i18n._('Line Direction')}
                                content={i18n._('Select the direction of the engraving path.')}
                            >
                                <div className="sm-parameter-row">
                                    <span className="sm-parameter-row__label">{i18n._('Method')}</span>
                                    <Select
                                        backspaceRemoves={false}
                                        className="sm-parameter-row__select-md"
                                        clearable={false}
                                        menuContainerStyle={{ zIndex: 5 }}
                                        name="line_direction"
                                        options={[{
                                            value: 'Horizontal',
                                            label: i18n._('Horizontal')
                                        }, {
                                            value: 'Vertical',
                                            label: i18n._('Vertical')
                                        }, {
                                            value: 'Diagonal',
                                            label: i18n._('Diagonal')
                                        }, {
                                            value: 'Diagonal2',
                                            label: i18n._('Diagonal2')
                                        }]}
                                        placeholder=""
                                        searchable={false}
                                        value={direction}
                                        onChange={(option) => { this.props.updateGcodeConfig({ direction: option.value }); }}
                                    />
                                </div>
                            </TipTrigger>
                            <div className="sm-parameter-row">
                                <span className="sm-parameter-row__label">{i18n._('Movement Mode')}</span>
                                <Select
                                    backspaceRemoves={false}
                                    className="sm-parameter-row__select-md"
                                    clearable={false}
                                    menuContainerStyle={{ zIndex: 5 }}
                                    name="Movement"
                                    options={[{
                                        value: 'greyscale-line',
                                        label: i18n._('Line')
                                    }, {
                                        value: 'greyscale-dot',
                                        label: i18n._('Dot')
                                    }]}
                                    placeholder={i18n._('Choose movement mode')}
                                    searchable={false}
                                    value={movementMode}
                                    onChange={this.actions.onChangeMovementMode}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <GcodeParameters
                    toolPath={this.props.toolPath}
                    updateGcodeConfig={this.props.updateGcodeConfig}
                />
            </React.Fragment>
        );
    }
}

const mapStateToProps = (state) => {
    const { multipleEngine } = state.machine;
    return {
        multipleEngine
    };
};

export default connect(mapStateToProps, null)(LaserParameters);
