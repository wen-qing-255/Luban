import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import i18next from 'i18next';
/* eslint-disable import/no-cycle */
import { cloneDeep, find, includes, remove, throttle } from 'lodash';
import ReactMarkdown from 'react-markdown';
import { EXTRUDER_TAB, MODEL_TAB } from './CategorySelector';
import { actions as printingActions } from '../../../flux/printing';
import i18n from '../../../lib/i18n';
import { Button } from '../../components/Buttons';
import Anchor from '../../components/Anchor';
import EmptyBox from './EmptyBox';
import CheckboxItem from '../ProfileManager/CheckboxItem';
import styles from '../ProfileManager/styles.styl';
import api from '../../../api';
import SettingItem from '../ProfileManager/SettingItem';
import { LEFT_EXTRUDER } from '../../../constants';
import { resolveDefinition } from '../../../../shared/lib/definitionResolver';

const EditorContent = ({
    selectedExtruder,
    selectedModelId,
    editorType = EXTRUDER_TAB,
    mode,
    setMode,
    printingDefinitionId,
    selectedSettingsDefaultValue
}) => {
    const {
        definitionEditorForExtruder, definitionEditorForModel,
        modelGroup, qualityDefinitions, qualityDefinitionsRight,
        editorDefinition
    } = useSelector(state => state?.printing);
    const [extruderEditor, setExtruderEditor] = useState(definitionEditorForExtruder.get(selectedExtruder));
    const [modelEditor, setModelEditor] = useState(definitionEditorForModel.get(selectedModelId));
    const [definitionManager, setDefinitionManager] = useState(null);
    const [categoryGroup, setCategoryGroup] = useState(null);
    const [checkedParams, setCheckedParams] = useState({});
    const [mdContent, setMdContent] = useState(null);
    const [imgPath, setImgPath] = useState('');
    const [activeCateId, setActiveCateId] = useState(0);
    const scrollDom = useRef(null);
    const dispatch = useDispatch();
    const lang = i18next.language;
    const canUpdateEditor = ((editorType === EXTRUDER_TAB && extruderEditor) || (editorType === MODEL_TAB && modelEditor)) && mode === 'show';
    useEffect(() => {
        const editor = definitionEditorForExtruder.get(selectedExtruder);
        setExtruderEditor(editor);
        setCheckedParams(editor ? { ...editor } : {});
        editorDefinition.get(selectedExtruder) && editorType === EXTRUDER_TAB && setDefinitionManager(editorDefinition.get(selectedExtruder));
    }, [selectedExtruder, editorType, definitionEditorForExtruder.size, editorDefinition]);

    useEffect(() => {
        const editor = definitionEditorForModel.get(selectedModelId);
        setCheckedParams(editor ? { ...editor } : {});
        setModelEditor(editor);
        editorDefinition.get(selectedModelId) && editorType === MODEL_TAB && setDefinitionManager(editorDefinition.get(selectedModelId));
    }, [selectedModelId, editorType, definitionEditorForModel.size, editorDefinition]);

    useEffect(() => {
        if (mode === 'show') {
            if (editorType === EXTRUDER_TAB) {
                setExtruderEditor(definitionEditorForExtruder.get(selectedExtruder));
            } else {
                setModelEditor(definitionEditorForModel.get(selectedModelId));
            }
        }
        setMdContent(null);
    }, [mode]);

    useEffect(() => {
        const temp = editorDefinition.get(selectedExtruder) || find(
            selectedExtruder === LEFT_EXTRUDER ? qualityDefinitions : qualityDefinitionsRight, { definitionId: printingDefinitionId }
        );
        setDefinitionManager(temp);
        setCategoryGroup(editorType === EXTRUDER_TAB ? temp?.printingProfileLevelForExtruder : temp?.printingProfileLevelForMesh);
    }, [printingDefinitionId, qualityDefinitions, qualityDefinitionsRight, selectedExtruder, editorDefinition]);

    const handleUpdateSelectedParams = (key, value, category) => {
        const temp = { ...checkedParams };
        if (temp[category]) {
            if (value) {
                !includes(temp[category], key) && temp[category].push(key);
            } else {
                remove(temp[category], (item) => {
                    return item === key;
                });
            }
        } else {
            temp[category] = [];
            value && temp[category].push(key);
        }
        setCheckedParams(temp);
    };

    const getMarkdown = async (key, category) => {
        try {
            const res = await api.getProfileDocs({ lang, selectCategory: category, selectProfile: key });
            setMdContent(res.body?.content);
            setImgPath(res.body?.imagePath);
        } catch (e) {
            console.info(e);
            setMdContent('');
        }
    };

    const handleConfirm = () => {
        if (editorType === EXTRUDER_TAB) {
            definitionEditorForExtruder.set(selectedExtruder, checkedParams);
            editorDefinition.set(selectedExtruder, { ...definitionManager });
        } else {
            definitionEditorForModel.set(selectedModelId, checkedParams);
            editorDefinition.set(selectedModelId, { ...definitionManager });
        }
        setMode('show');
    };

    const handleClearEditor = () => {
        if (editorType === EXTRUDER_TAB) {
            definitionEditorForExtruder.delete(selectedExtruder);
            setExtruderEditor(null);
        } else {
            definitionEditorForModel.delete(selectedModelId);
            setModelEditor(null);
        }
        setCheckedParams({});
    };

    const handleUpdateDefinition = (key, value) => {
        const selected = editorType === EXTRUDER_TAB ? selectedExtruder : selectedModelId;
        const newDefinition = cloneDeep(editorDefinition.get(selected));
        resolveDefinition(newDefinition, [[key, value]]);
        const newMap = new Map([...editorDefinition.entries()]);
        newMap.set(selected, newDefinition);
        dispatch(printingActions.updateState({
            editorDefinition: newMap
        }));
    };

    const setActiveCate = (cateId) => {
        if (scrollDom.current) {
            const container = scrollDom.current.parentElement;
            const offsetTops = [...scrollDom.current.children].map(i => {
                return i.offsetTop - 136;
            });
            if (cateId !== undefined) {
                container.scrollTop = offsetTops[cateId];
            } else {
                cateId = offsetTops.findIndex((item, idx) => {
                    if (idx < offsetTops.length - 1) {
                        return item < container.scrollTop
                            && offsetTops[idx + 1] > container.scrollTop;
                    } else {
                        return item < container.scrollTop;
                    }
                });
                cateId = Math.max(cateId, 0);
            }
            setActiveCateId(cateId);
        }
    };

    const renderCheckboxList = ({
        renderList,
        settings,
        mainCategory
    }) => {
        return renderList && renderList.map((profileKey) => {
            if (settings[profileKey].childKey?.length > 0) {
                return (
                    <div key={profileKey} className={`margin-left-${(settings[profileKey].zIndex - 1) * 16}`}>
                        <Anchor onClick={() => getMarkdown(profileKey, mainCategory)}>
                            <CheckboxItem
                                settings={settings}
                                defaultValue={includes(checkedParams[mainCategory], profileKey)}
                                definitionKey={profileKey}
                                key={profileKey}
                                configCategory={mainCategory}
                                onChangeDefinition={handleUpdateSelectedParams}
                            />
                        </Anchor>
                        {renderCheckboxList({
                            renderList: settings[profileKey].childKey,
                            settings,
                            mainCategory
                        })}
                    </div>
                );
            } else {
                return (
                    <div key={profileKey} className={`margin-left-${(settings[profileKey].zIndex < 3 ? settings[profileKey].zIndex - 1 : 1) * 16}`}>
                        <Anchor onClick={() => getMarkdown(profileKey, mainCategory)}>
                            <CheckboxItem
                                settings={settings}
                                defaultValue={includes(checkedParams[mainCategory], profileKey)}
                                definitionKey={profileKey}
                                key={profileKey}
                                configCategory={mainCategory}
                                onChangeDefinition={handleUpdateSelectedParams}
                            />
                        </Anchor>
                    </div>
                );
            }
        });
    };

    return (
        <div className="margin-horizontal-16 margin-vertical-16 height-all-minus-164 border-radius-16 flex-grow-1 width-all-minus-296">
            <div className="sm-flex sm-flex-direction-c height-percent-100">
                <div className="border-radius-top-16 border-bottom-normal sm-flex justify-space-between align-center padding-vertical-12 padding-horizontal-16 background-color-white">
                    <div>
                        {i18n._('key-profileManager/Params-list')}
                    </div>
                    <div>
                        <Button
                            width="120px"
                            priority="level-three"
                            disabled={!canUpdateEditor}
                            className={mode !== 'update' ? 'visibility-visible' : 'visibility-hidden'}
                            onClick={() => setMode('update')}
                        >
                            {i18n._('key-profileManager/Update-Editor')}
                        </Button>
                        {canUpdateEditor && (
                            <Button
                                width="120px"
                                priority="level-three"
                                className="margin-left-12"
                                onClick={handleClearEditor}
                            >
                                {i18n._('key-profileManager/Clear-Editor')}
                            </Button>
                        )}
                    </div>
                </div>
                {mode === 'show' && (
                    <div className="position-relative background-color-white border-radius-bottom-16 height-percent-100 height-100-percent-minus-56">
                        {(!modelGroup.models?.length && editorType === MODEL_TAB) && (
                            <EmptyBox
                                tipContent={i18n._('key-3dp/Error-Cannot add editor because no model')}
                                addButton={false}
                                setMode={setMode}
                            />
                        )}
                        {((editorType === MODEL_TAB && !modelEditor && modelGroup.models.length) || (editorType === EXTRUDER_TAB && !extruderEditor)) && (
                            <EmptyBox
                                tipContent={i18n._('key-3dp/Tip-Never has editor')}
                                addButton
                                setMode={setMode}
                            />
                        )}
                        {((modelEditor && editorType === MODEL_TAB) || (extruderEditor && editorType === EXTRUDER_TAB)) && definitionManager && (
                            <div className={classNames('sm-flex height-percent-100 overflow-x-auto margin-right-16', styles['manager-params-docs'])}>
                                <div className={classNames('width-percent-60 padding-16 overflow-y-auto min-width-528')}>
                                    {Object.keys(editorType === EXTRUDER_TAB ? extruderEditor : modelEditor)?.map(objectKey => {
                                        const currentEditor = editorType === EXTRUDER_TAB ? extruderEditor : modelEditor;
                                        return (
                                            <div className="margin-bottom-16" key={objectKey}>
                                                <div className="font-size-middle font-weight-bold height-32">
                                                    {i18n._(`key-Definition/Catagory-${objectKey}`)}
                                                </div>
                                                {currentEditor[objectKey].map(profileKey => {
                                                    return (
                                                        <Anchor onClick={() => getMarkdown(profileKey, objectKey)}>
                                                            <SettingItem
                                                                settings={definitionManager?.settings}
                                                                definitionKey={profileKey}
                                                                key={profileKey}
                                                                isDefaultDefinition={definitionManager?.isRecommended}
                                                                defaultValue={{
                                                                    value: selectedSettingsDefaultValue[profileKey]?.default_value
                                                                }}
                                                                onChangeDefinition={handleUpdateDefinition}
                                                            />
                                                        </Anchor>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className={classNames(
                                    'min-width-356 width-percent-40 background-grey-3 height-perccent-100 overflow-y-auto',
                                    'margin-top-16 margin-left-16 margin-bottom-48 border-radius-16',
                                )}
                                >
                                    <div className={classNames(styles['manager-params-docs-content'], 'padding-16 overflow-y-auto')}>
                                        <ReactMarkdown transformImageUri={(input) => (`atom:///${imgPath}/${input.slice(3)}`)}>
                                            {mdContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {mode === 'update' && (
                    <div className="sm-flex sm-flex-direction-c height-percent-100">
                        <div className={classNames('background-color-white border-radius-bottom-16 sm-flex  height-100-percent-minus-40', styles['manager-params-docs'])}>
                            <div className="category-menu max-width-208 padding-horizontal-16 padding-top-16 border-right-normal height-percent-100">
                                {categoryGroup && Object.keys(categoryGroup).map((key, index) => {
                                    if (categoryGroup[key].length > 0) {
                                        return (
                                            <Anchor
                                                onClick={() => setActiveCate(index)}
                                                key={key}
                                            >
                                                <div className={classNames(
                                                    'width-percent-100 text-overflow-ellipsis height-32 border-radius-4 padding-horizontal-8',
                                                    { 'background-color-blue': activeCateId === index }
                                                )}
                                                >
                                                    {i18n._(`key-Definition/Catagory-${key}`)}
                                                </div>
                                            </Anchor>
                                        );
                                    } else {
                                        return null;
                                    }
                                })}
                            </div>
                            <div className={classNames('params-detail-wrapper', 'width-percent-100 sm-flex margin-right-16 overflow-x-auto')}>
                                <div
                                    className="min-width-408 width-percent-60 padding-16 height-percent-100 overflow-y-auto"
                                    onWheel={throttle(
                                        () => {
                                            setActiveCate();
                                        },
                                        200,
                                        { leading: false, trailing: true }
                                    )}
                                >
                                    <div ref={scrollDom}>
                                        {categoryGroup && Object.keys(categoryGroup).map(key => {
                                            if (categoryGroup[key].length > 0) {
                                                return (
                                                    <div className="margin-bottom-16" key={key}>
                                                        <div className="font-size-middle font-weight-bold">
                                                            {i18n._(`key-Definition/Catagory-${key}`)}
                                                        </div>
                                                        {
                                                            renderCheckboxList({
                                                                renderList: categoryGroup[key],
                                                                settings: definitionManager.settings,
                                                                mainCategory: key
                                                            })
                                                        }
                                                    </div>
                                                );
                                            } else {
                                                return null;
                                            }
                                        })}
                                    </div>
                                </div>
                                <div className={classNames(
                                    'min-width-264 width-percent-40 background-grey-3 height-perccent-100 overflow-y-auto',
                                    'margin-top-16 margin-left-16 margin-bottom-48 border-radius-16',
                                )}
                                >
                                    <div className={classNames(styles['manager-params-docs-content'], 'padding-16 overflow-y-auto')}>
                                        <ReactMarkdown transformImageUri={(input) => (`atom:///${imgPath}/${input.slice(3)}`)}>
                                            {mdContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="background-transparent padding-top-8 sm-flex justify-flex-end height-40-only">
                            <Button
                                width="96px"
                                type="default"
                                priority="level-two"
                                onClick={() => setMode('show')}
                            >
                                {i18n._('key-Modal/Common-Cancel')}
                            </Button>
                            <Button
                                width="96px"
                                type="primary"
                                priority="level-two"
                                className="margin-left-8"
                                onClick={handleConfirm}
                            >
                                {i18n._('key-Modal/Common-Yes')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

EditorContent.propTypes = {
    selectedExtruder: PropTypes.string.isRequired,
    selectedModelId: PropTypes.string.isRequired,
    editorType: PropTypes.string.isRequired,
    mode: PropTypes.string.isRequired,
    setMode: PropTypes.func.isRequired,
    printingDefinitionId: PropTypes.string.isRequired,
    selectedSettingsDefaultValue: PropTypes.object.isRequired
};

export default EditorContent;