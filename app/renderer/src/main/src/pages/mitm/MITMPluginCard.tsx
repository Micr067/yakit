import React, {useEffect, useState} from "react";
import {Button, Card, Col, Collapse, Divider, Empty, List, Popconfirm, Row, Space, Tabs, Tag} from "antd";
import {EditorProps, HTTPPacketEditor, YakCodeEditor, YakEditor} from "../../utils/editors";
import {genDefaultPagination, YakScript, YakScriptHookItem, YakScriptHooks} from "../invoker/schema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import {showModal} from "../../utils/showModal";
import {YakModuleList} from "../yakitStore/YakitStorePage";
import {HTTPFlowMiniTable} from "../../components/HTTPFlowMiniTable";
import {YakitLogViewers} from "../invoker/YakitLogFormatter";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import ReactJson from "react-json-view";
import {SelectOne} from "../../utils/inputUtil";
import {YakScriptParamsSetter} from "../invoker/YakScriptParamsSetter";
import {mitmPluginTemplateShort} from "../invoker/YakScriptCreator";
import "../main.css";


export interface MITMPluginCardProp {
    proxy?: string
    downloadCertNode?: React.ReactNode
    setFilterNode?: React.ReactNode
    hooks: YakScriptHooks[]
    messages: ExecResultLog[]
    onSubmitScriptContent?: (script: string) => any
    onSubmitYakScriptId?: (id: number, params: YakExecutorParam[]) => any
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    onExit?: () => any
    autoUpdate?: boolean
}

const defaultScript = mitmPluginTemplateShort;

const {ipcRenderer} = window.require("electron");

export const MITMPluginCard: React.FC<MITMPluginCardProp> = (props) => {
    // const [selectedYakScriptId, setSelectYakScriptId] = useState();
    // const [yakScript, setYakScript] = useState<YakScript>();
    // const [script, setScript] = useState(defaultScript);
    const [tab, setTab] = useState("history");
    // const [userDefined, setUserDefined] = useState(false);

    // history
    const [total, setTotal] = useState(0);

    useEffect(() => {
        let id = setInterval(() => {
            ipcRenderer.invoke("mitm-get-current-hook")
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    const enablePlugin = () => {
        let m = showModal({
            title: "选择启用的 MITM 插件",
            width: "60%",
            content: <>
                <YakModuleList Type={"mitm"} Keyword={""} onClicked={(script) => {
                    if (!props.onSubmitYakScriptId) {
                        return
                    }

                    if ((script.Params || []).length > 0) {
                        let m2 = showModal({
                            title: `设置 [${script.ScriptName}] 的参数`,
                            content: <>
                                <YakScriptParamsSetter
                                    {...script}
                                    params={[]}
                                    onParamsConfirm={(p: YakExecutorParam[]) => {
                                        props.onSubmitYakScriptId && props.onSubmitYakScriptId(script.Id, p)
                                        m.destroy()
                                        m2.destroy()
                                        setTab("mitm-output")
                                    }}
                                    submitVerbose={"设置 MITM 参数"}
                                />
                            </>, width: "50%",
                        })
                    } else {
                        props.onSubmitYakScriptId && props.onSubmitYakScriptId(script.Id, [])
                        m.destroy()
                        setTab("mitm-output")
                    }

                }} isIgnored={false} isHistory={false}/>
            </>
        })
    }

    return <div style={{height: "100%"}}>
        <Tabs
            className={"httphacker-tabs"}
            size={"small"} type={"card"} activeKey={tab} onChange={setTab}
            style={{
                paddingTop: 4
            }}
        >
            <Tabs.TabPane key={"history"} tab={"历史请求"}>
                <div style={{height: "100%", overflow: "hidden"}}>
                    <HTTPFlowMiniTable
                        simple={true}
                        onTotal={setTotal} // onSendToWebFuzzer={props.onSendToWebFuzzer}
                        filter={{
                            SearchURL: "",
                            Pagination: {...genDefaultPagination(), Page: 1, Limit: 20}
                        }}
                        source={""}
                        autoUpdate={props.autoUpdate}
                        onSendToWebFuzzer={props.onSendToWebFuzzer}
                    />
                </div>
            </Tabs.TabPane>
            {/*<Tabs.TabPane key={"plugin"} tab={"劫持插件"} disabled={true}>*/}
            {/*    <div style={{height: "100%"}}>*/}
            {/*        <Card*/}
            {/*            className={"flex-card"}*/}
            {/*            style={{height: "100%"}}*/}
            {/*            title={<>*/}
            {/*                <Space>*/}
            {/*                    <div>MITM 插件</div>*/}
            {/*                    <Divider type={"vertical"}/>*/}
            {/*                    <span style={{color: '#999'}}>*/}
            {/*                    <SelectOne*/}
            {/*                        size={"small"} formItemStyle={{marginBottom: 0}}*/}
            {/*                        data={[*/}
            {/*                            {value: false, text: "插件模式"},*/}
            {/*                            {value: true, text: "自定义模式"},*/}
            {/*                        ]} label={" "} colon={false} value={userDefined}*/}
            {/*                        setValue={setUserDefined}*/}
            {/*                    />*/}
            {/*                </span>*/}
            {/*                </Space>*/}
            {/*            </>}*/}
            {/*            size={"small"} bodyStyle={{padding: 0, height: "100%"}}*/}
            {/*            extra={[*/}
            {/*                <Space>*/}
            {/*                    {*/}
            {/*                        userDefined ? <Button*/}
            {/*                            type={"primary"}*/}
            {/*                            size={"small"}*/}
            {/*                            onClick={() => {*/}
            {/*                                props.onSubmitScriptContent && props.onSubmitScriptContent(script)*/}
            {/*                                setTab("mitm-output")*/}
            {/*                            }}*/}
            {/*                        >热加载</Button> : <Button*/}
            {/*                            type={"link"}*/}
            {/*                            size={"small"}*/}
            {/*                            onClick={enablePlugin}>*/}
            {/*                            插件商店*/}
            {/*                        </Button>*/}
            {/*                    }*/}

            {/*                </Space>*/}
            {/*            ]}*/}
            {/*        >*/}
            {/*            {userDefined ? <>*/}
            {/*                <div style={{height: "100%", minHeight: 400}}>*/}
            {/*                    <YakCodeEditor*/}
            {/*                        noHeader={true} noPacketModifier={true}*/}
            {/*                        originValue={Buffer.from(script)}*/}
            {/*                        onChange={e => setScript(e.toString())}*/}
            {/*                        language={"yak"}*/}
            {/*                        extraEditorProps={{*/}
            {/*                            noMiniMap: true*/}
            {/*                        } as EditorProps}*/}
            {/*                    />*/}
            {/*                </div>*/}
            {/*            </> : <>*/}
            {/*                {(props.hooks || []).length > 0 ? <Collapse>*/}
            {/*                    {(props.hooks || []).sort((a, b) => {*/}
            {/*                        return a.HookName.localeCompare(b.HookName)*/}
            {/*                    }).map(i => <Collapse.Panel*/}
            {/*                        extra={<Tag onClick={() => {*/}
            {/*                            showModal({*/}
            {/*                                title: "JSON", content: <>*/}
            {/*                                    <ReactJson src={props.hooks}/>*/}
            {/*                                </>*/}
            {/*                            })*/}
            {/*                        }}>JSON</Tag>}*/}
            {/*                        key={i.HookName} header={i.HookName}*/}
            {/*                    >*/}
            {/*                        <YakScriptHooksViewer hooks={i}/>*/}
            {/*                    </Collapse.Panel>)}*/}
            {/*                </Collapse> : <Empty style={{*/}
            {/*                    marginBottom: 50, marginTop: 50,*/}
            {/*                }}>*/}
            {/*                    暂无 MITM 插件被启用 <br/>*/}
            {/*                    <Button*/}
            {/*                        type={"primary"}*/}
            {/*                        onClick={enablePlugin}*/}
            {/*                    >点击这里启用插件</Button>*/}
            {/*                </Empty>}*/}
            {/*            </>}*/}
            {/*        </Card>*/}
            {/*    </div>*/}
            {/*</Tabs.TabPane>*/}
            {/*<Tabs.TabPane key={"mitm-output"} tab={"插件输出"}>*/}
            {/*    <div style={{overflowX: "auto", height: "100%"}}>*/}
            {/*        <YakitLogViewers data={props.messages}/>*/}
            {/*    </div>*/}
            {/*</Tabs.TabPane>*/}
        </Tabs>

    </div>
};

export interface YakScriptHooksViewerProp {
    hooks: YakScriptHooks
}

export const YakScriptHooksViewer: React.FC<YakScriptHooksViewerProp> = (props) => {
    return <List<YakScriptHookItem>
        pagination={false} size={"small"} split={true}
        dataSource={props.hooks!.Hooks} bordered={false}
        renderItem={i => {
            return <List.Item style={{width: "100%", padding: 0}} extra={<>

            </>}>
                <Card
                    size={"small"} bordered={false} hoverable={true}
                    style={{width: "100%"}}
                >
                    <Row>
                        <Col span={16}>
                            <Space style={{width: "100%", textAlign: "left"}}>
                                {i.YakScriptName ? `${i.YakScriptName}[${i.YakScriptId}]` : i.Verbose}

                            </Space>
                        </Col>
                        <Col span={8}>
                            <div style={{width: "100%", textAlign: "right"}}>
                                <Popconfirm
                                    title={"确定要移除该 Hook 吗？"}
                                    onConfirm={() => {
                                        ipcRenderer.invoke("mitm-remove-hook", {
                                            HookName: [props.hooks.HookName],
                                            RemoveHookID: [i.YakScriptName],
                                        } as any)
                                    }}
                                >
                                    <Button
                                        danger={true} size={"small"}
                                        type={"link"}
                                    >移除Hook</Button>
                                </Popconfirm>
                            </div>
                        </Col>

                    </Row>
                </Card>
            </List.Item>
        }}
    >

    </List>
};