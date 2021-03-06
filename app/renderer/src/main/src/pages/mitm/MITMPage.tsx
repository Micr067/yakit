import React, {useEffect, useState} from "react";
import {
    Alert,
    Button, Checkbox,
    Col,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    notification,
    PageHeader,
    Row,
    Space,
    Spin,
    Steps,
    Switch,
    Tag,
    Typography
} from "antd";
import {failed, info, warn} from "../../utils/notification";
import {CheckOutlined, PoweroffOutlined, ReloadOutlined} from "@ant-design/icons";
import {HTTPPacketEditor} from "../../utils/editors";
import {MITMFilters, MITMFilterSchema} from "./MITMFilters";
import {showDrawer, showModal} from "../../utils/showModal";
import {MITMPluginCard} from "./MITMPluginCard";
import {ExecResult, YakScriptHooks} from "../invoker/schema";
import {ExecResultLog} from "../invoker/batch/ExecMessageViewer";
import {ExtractExecResultMessage} from "../../components/yakitLogSchema";
import {YakExecutorParam} from "../invoker/YakExecutorParams";
import "./MITMPage.css";
import {SelectOne} from "../../utils/inputUtil";
import {MITMPluginOperator} from "./MITMPluginOperator";
import {useLatest, useReactive} from "ahooks";

const {Text} = Typography;
const {Item} = Form;
const {ipcRenderer} = window.require("electron");

export interface MITMPageProp {
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

export interface MITMResponse extends MITMFilterSchema {
    isHttps: boolean,
    request: Uint8Array,
    url: string,
    id: number

    forResponse?: boolean
    response?: Uint8Array
    responseId?: number
}

const dropRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-request", id)
}


const dropResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-drop-response", id)
}


const forwardRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-request", id)
}


const forwardResponse = (id: number) => {
    return ipcRenderer.invoke("mitm-forward-response", id)
}

const allowHijackedResponseByRequest = (id: number) => {
    return ipcRenderer.invoke("mitm-hijacked-current-response", id)
}

export const MITMPage: React.FC<MITMPageProp> = (props) => {
    const [status, setStatus] = useState<"idle" | "hijacked" | "hijacking">("idle");
    const [passiveMode, setPassiveMode] = useState(false);

    const [error, setError] = useState("");
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8083);
    const [downstreamProxy, setDownstreamProxy] = useState<string>();
    const [loading, setLoading] = useState(false);

    // ????????????????????????????????????
    const [currentPacketInfo, setCurrentPacketInfo] = useState<{
        currentPacket: Uint8Array,
        currentPacketId: number,
    }>({currentPacketId: 0, currentPacket: new Buffer([])});
    const {currentPacket, currentPacketId} = currentPacketInfo;
    const clearCurrentPacket = () => {
        setCurrentPacketInfo({currentPacketId: 0, currentPacket: new Buffer([])})
    }
    const [modifiedPacket, setModifiedPacket] = useState<Uint8Array>(new Buffer([]));

    // ???????????? ??? ???????????????????????????
    const [autoForward, setAutoForward] = useState(true);
    const [hijackAllResponse, setHijackAllResponse] = useState(false); // ??????????????????
    const [allowHijackCurrentResponse, setAllowHijackCurrentResponse] = useState(false); // ?????????????????????
    const [initialed, setInitialed] = useState(false);
    const [forResponse, setForResponse] = useState(false);
    const [haveSideCar, setHaveSideCar] = useState(true);

    const [urlInfo, setUrlInfo] = useState("?????????...")
    const [ipInfo, setIpInfo] = useState("")

    // yakit log message
    const [logs, setLogs] = useState<ExecResultLog[]>([]);
    const latestLogs = useLatest<ExecResultLog[]>(logs);

    // filter ?????????
    const [mitmFilter, setMITMFilter] = useState<MITMFilterSchema>({});

    // hooks ????????????????????? Hook ??????
    const [mitmHooks, setMITMHooks] = useState<YakScriptHooks[]>([]);

    // ?????? Forward ????????????????????????????????????????????????????????????????????????
    const forward = () => {
        // ID ?????????
        if (!currentPacketId) {
            return
        }

        setLoading(true);
        setStatus("hijacking");
        setAllowHijackCurrentResponse(false)
        setForResponse(false)

        if (forResponse) {
            ipcRenderer.invoke("mitm-forward-modified-response", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
                setTimeout(() => setLoading(false))
            })
        } else {
            ipcRenderer.invoke("mitm-forward-modified-request", modifiedPacket, currentPacketId).finally(() => {
                clearCurrentPacket()
                setTimeout(() => setLoading(false))
            })
        }
    }

    const recover = () => {
        ipcRenderer.invoke("mitm-recover").then(() => {
            // success("?????? MITM ????????????")
        })
    }

    // ?????????????????????????????????
    useEffect(() => {
        setInitialed(false)
        // ????????????????????????
        ipcRenderer.invoke("mitm-have-current-stream").then(data => {
            const {haveStream, host, port} = data;
            if (haveStream) {
                setStatus("hijacking")
                setHost(host);
                setPort(port);
            }
        }).finally(() => {
            recover()
            setTimeout(() => setInitialed(true), 500)
        })

        // ???????????? MITM ??????????????????????????????????????????????????????????????????????????????????????? MITM ???????????????
        ipcRenderer.on("client-mitm-start-success", () => {
            setStatus("hijacking")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        })

        // ?????? MITM ??? Message ???YakitLog???
        const messages: ExecResultLog[] = [];
        ipcRenderer.on("client-mitm-message", (e, data: ExecResult) => {
            let msg = ExtractExecResultMessage(data);
            if (msg !== undefined) {
                // logHandler.logs.push(msg as ExecResultLog)
                // if (logHandler.logs.length > 25) {
                //     logHandler.logs.shift()
                // }
                messages.push(msg as ExecResultLog)
                if (messages.length > 25) {
                    messages.shift()
                }
            }
        })

        // ?????? MITM ??? ???????????? Hooks
        ipcRenderer.on("client-mitm-hooks", (e, data: YakScriptHooks[]) => {
            setMITMHooks([...data])
        })

        // let currentFlow: HTTPFlow[] = []
        ipcRenderer.on("client-mitm-history-update", (e: any, data: any) => {
            // currentFlow.push(data.historyHTTPFlow as HTTPFlow)
            //
            // if (currentFlow.length > 30) {
            //     currentFlow = [...currentFlow.slice(0, 30)]
            // }
            // setFlows([...currentFlow])
        })

        ipcRenderer.on("client-mitm-error", (e, msg) => {
            if (!msg) {
                info("MITM ????????????????????????")
            } else {
                failed("MITM ?????????????????????????????????")
                Modal.error({
                    mask: true, title: "?????? MITM ????????? ERROR!",
                    content: <>{error}</>
                })
            }
            ipcRenderer.invoke("mitm-stop-call")
            setError(`${msg}`)
            setStatus("idle")
            setTimeout(() => {
                setLoading(false)
            }, 300)
        });
        ipcRenderer.on("client-mitm-filter", (e, msg) => {
            setMITMFilter({
                includeSuffix: msg.includeSuffix,
                excludeMethod: msg.excludeMethod,
                excludeSuffix: msg.excludeSuffix,
                includeHostname: msg.includeHostname,
                excludeHostname: msg.excludeHostname,
            })
        })

        const updateLogs = () => {
            if (latestLogs.current.length !== messages.length) {
                setLogs([...messages])
                return
            }

            if (latestLogs.current.length > 0 && messages.length > 0) {
                if (latestLogs.current[0].data !== messages[0].data) {
                    setLogs([...messages])
                    return
                }
            }
        }
        updateLogs()
        let id = setInterval(() => {
            updateLogs()
        }, 1000)

        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-mitm-error")
            // ipcRenderer.invoke("mitm-close-stream")
        }
    }, [])

    useEffect(() => {
        if (hijackAllResponse && currentPacketId > 0) {
            allowHijackedResponseByRequest(currentPacketId)
        }
    }, [hijackAllResponse, currentPacketId])
    // ????????????????????????????????????
    const forwardHandler = (e: any, msg: MITMResponse) => {
        setMITMFilter({
            includeSuffix: msg.includeSuffix,
            excludeMethod: msg.excludeMethod,
            excludeSuffix: msg.excludeSuffix,
            includeHostname: msg.includeHostname,
            excludeHostname: msg.excludeHostname,
        })

        // passive ????????? mitm ????????????
        //    ??????????????????????????????????????????????????????????????????
        if (passiveMode) {
            if (msg.forResponse) {
                forwardResponse(msg.responseId || 0)
            } else {
                forwardRequest(msg.id || 0)
            }
            return
        }

        if (msg.forResponse) {
            if (!msg.response || !msg.responseId) {
                // console.info(msg)
                failed("BUG: MITM ????????????????????????????????? Response ??? Response ID")
                return
            }
            if (autoForward) {
                forwardResponse(msg.responseId || 0)
                if (!!currentPacket) {
                    clearCurrentPacket()
                }
            } else {
                setForResponse(true)
                setStatus("hijacked")
                setCurrentPacketInfo({currentPacket: msg.response, currentPacketId: msg.responseId})
                // setCurrentPacket(new Buffer(msg.response).toString("utf8"))
                // setCurrentPacketId(msg.responseId || 0);
            }
        } else {
            if (msg.request) {
                if (autoForward) {
                    forwardRequest(msg.id)
                    if (!!currentPacket) {
                        clearCurrentPacket()
                    }
                    // setCurrentPacket(String.fromCharCode.apply(null, msg.request))
                } else {
                    setStatus("hijacked")
                    setForResponse(false)
                    // setCurrentPacket(msg.request)
                    // setCurrentPacketId(msg.id)
                    setCurrentPacketInfo({currentPacket: msg.request, currentPacketId: msg.id})
                    setUrlInfo(msg.url)
                    ipcRenderer.invoke("fetch-url-ip", msg.url.split('://')[1].split('/')[0]).then((res) => {
                        setIpInfo(res)
                    })
                }
            }
        }
    }

    useEffect(() => {
        ipcRenderer.on("client-mitm-hijacked", forwardHandler);
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-hijacked")
        }
    }, [autoForward])

    useEffect(() => {
        ipcRenderer.invoke("mitm-auto-forward", autoForward).finally(() => {
            console.info(`??????????????????????????????${autoForward}`)
        })
    }, [autoForward])

    useEffect(() => {
        if (currentPacketId <= 0 && status === "hijacked") {
            recover()
            const id = setInterval(() => {
                recover()
            }, 500)
            return () => {
                clearInterval(id)
            }
        }
    }, [currentPacketId])

    const addr = `http://${host}:${port}`;

    if (!initialed) {
        return <div style={{textAlign: "center", paddingTop: 120}}>
            <Spin spinning={true} tip={"??????????????? MITM"}/>
        </div>
    }

    const start = () => {
        setLoading(true)
        setError("")
        ipcRenderer.invoke("mitm-start-call", host, port, downstreamProxy).catch((e: any) => {
            notification["error"]({message: `??????????????????????????????${e}`})
        })
    }

    const stop = () => {
        setLoading(true)
        ipcRenderer.invoke("mitm-stop-call").then(() => {
            setStatus("idle")
        }).catch((e: any) => {
            notification["error"]({message: `??????????????????????????????${e}`})
        }).finally(() => setTimeout(() => {
            setLoading(false)
            setPassiveMode(false)
        }, 300))
    }

    const hijacking = () => {
        // setCurrentPacket(new Buffer([]));
        clearCurrentPacket()
        setLoading(true);
        setStatus("hijacking");
    }

    function getCurrentId() {
        return currentPacketId
    }

    const downloadCert = () => {
        return <Button
            type={"link"}
            onClick={() => {
                const text = `wget -e use_proxy=yes -e http_proxy=${addr} http://download-mitm-cert.yaklang.io -O yakit-mitm-cert.pem`
                showModal({
                    title: "?????? SSL/TLS ??????????????? HTTPS",
                    content: <div>
                        ?????????????????????????????????????????????????????????
                        <br/>
                        <Text copyable={true}>{text}</Text>
                        <br/>
                        <br/>
                        <p style={{color: "red"}}>
                            ??????????????????????????????????????????????????????:{addr} ??? <br/>
                            ?????? http://download-mitm-cert.yaklang.io
                            ?????????????????????
                        </p>
                    </div>
                })
            }}
        >???????????? SSL/TLS ??????</Button>
    };

    const setFilter = () => {
        return <Button type={"link"}
                       onClick={() => {
                           let m = showDrawer({
                               placement: "top", height: "50%",
                               content: <>
                                   <MITMFilters
                                       filter={mitmFilter}
                                       onFinished={(filter) => {
                                           setMITMFilter({...filter})
                                           m.destroy()
                                       }}/>
                               </>
                           });
                       }}
        >???????????????</Button>
    }

    return <div style={{height: "100%", width: "100%"}}>
        {/*{error && <Alert style={{marginBottom: 8}} message={error} type={"error"}/>}*/}
        {/*<div style={{marginLeft: 100, marginRight: 100}}>*/}
        {/*    <Steps size={"small"} current={status === "idle" ? 0 : 1}>*/}
        {/*        <Step*/}
        {/*            title={"?????? MITM ????????????"} active={status === "idle"}*/}
        {/*            key={"idle"} subTitle={`${host}:${port}`}*/}
        {/*            status={status === "idle" ? "process" : "finish"}*/}
        {/*        >*/}
        {/*        </Step>*/}
        {/*        <Step title={"???????????? / ????????????"} key={"hijacked"}*/}
        {/*              subTitle={status === "idle" ? undefined : <>*/}
        {/*                  <Space>*/}
        {/*                      <Divider type={"vertical"}/>*/}
        {/*                      <>?????????</>*/}
        {/*                      <Switch size={"small"} checked={haveSideCar} onChange={setHaveSideCar}/>*/}
        {/*                  </Space>*/}
        {/*              </>}*/}
        {/*              active={status === "hijacked" || status === "hijacking"}>*/}
        {/*        </Step>*/}
        {/*    </Steps>*/}
        {/*</div>*/}
        {(() => {
            switch (status) {
                case "idle":
                    return <Spin spinning={loading}>
                        <Form
                            style={{marginTop: 40}}
                            onSubmitCapture={e => {
                                e.preventDefault()
                                start()
                            }}
                            layout={"horizontal"} labelCol={{span: 7}}
                            wrapperCol={{span: 13}}
                        >
                            <Item label={"????????????????????????"}>
                                <Input value={host} onChange={e => setHost(e.target.value)}/>
                            </Item>
                            <Item label={"????????????????????????"}>
                                <InputNumber value={port} onChange={e => setPort(e)}/>
                            </Item>
                            <Item label={"????????????"} help={"???????????? MITM ???????????????????????????????????????????????????????????????????????????????????????????????????????????????/??????"}>
                                <Input value={downstreamProxy} onChange={e => setDownstreamProxy(e.target.value)}/>
                            </Item>
                            <Item label={" "} colon={false}>
                                <Space>
                                    <Button type={"primary"} htmlType={"submit"}>
                                        ??????????????????
                                    </Button>
                                    <Button onClick={() => {
                                        start()
                                        setPassiveMode(true)
                                        setAutoForward(true)
                                    }}>
                                        ??????????????????
                                    </Button>
                                </Space>
                            </Item>
                        </Form>
                    </Spin>
                case "hijacking":
                case "hijacked":
                    return <div id={"mitm-hijacking-container"}
                                style={{marginLeft: 12, marginRight: 12, height: "100%"}}>
                        {passiveMode ? <div id={"mitm-plugin-operator-container"} style={{height: "100%"}}>
                            <MITMPluginOperator
                                proxy={`http://${host}:${port}`}
                                downloadCertNode={downloadCert()} setFilterNode={setFilter()}
                                onExit={() => {
                                    stop()
                                }}
                                messages={logs} hooks={mitmHooks}
                                onSubmitScriptContent={e => {
                                    ipcRenderer.invoke("mitm-exec-script-content", e)
                                }}
                                onSubmitYakScriptId={(id: number, params: YakExecutorParam[]) => {
                                    info(`?????? MITM ??????[${id}]`)
                                    ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
                                }}
                                onSendToWebFuzzer={props.onSendToWebFuzzer}
                            />
                        </div> : <Row gutter={14} style={{height: "100%"}}>
                            <Col span={haveSideCar ? 15 : 24}
                                 style={{display: "flex", flexDirection: "column", height: "100%"}}>
                                <PageHeader
                                    title={'?????? HTTP Request'} subTitle={`http://${host}:${port}`}
                                    style={{marginRight: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 8}}
                                    extra={
                                        <Space>
                                            {downloadCert()}
                                            <Button danger={true} type={"primary"}
                                                    onClick={() => {
                                                        stop()
                                                        setUrlInfo("?????????...")
                                                        setIpInfo("")
                                                    }} icon={<PoweroffOutlined/>}
                                            >????????????</Button>
                                        </Space>}>
                                    <Row>
                                        <Col span={12}>
                                            <div style={{width: "100%", textAlign: "left"}}>
                                                <Space>
                                                    <Button
                                                        type={"primary"}
                                                        disabled={status === "hijacking"}
                                                        onClick={() => {
                                                            forward()
                                                        }}>????????????</Button>
                                                    <Button
                                                        disabled={status === "hijacking"}
                                                        danger={true}
                                                        onClick={() => {
                                                            hijacking()
                                                            if (forResponse) {
                                                                dropResponse(currentPacketId).finally(() => {
                                                                    setTimeout(() => {
                                                                        setLoading(false)
                                                                    }, 300)
                                                                })
                                                            } else {
                                                                dropRequest(currentPacketId).finally(() => {
                                                                    setTimeout(() => setLoading(false), 300)
                                                                })
                                                            }
                                                            setUrlInfo("?????????...")
                                                            setIpInfo("")
                                                        }}>????????????</Button>
                                                    {
                                                        (!forResponse && !!currentPacket) &&  // ???????????????????????????
                                                        status === "hijacked" && // ????????????????????? hijacked
                                                        !hijackAllResponse && // ?????????????????????????????????????????????????????????
                                                        <Button
                                                            disabled={allowHijackCurrentResponse}
                                                            type={allowHijackCurrentResponse ? "primary" : "default"}
                                                            onClick={() => {
                                                                if (!allowHijackCurrentResponse) {
                                                                    allowHijackedResponseByRequest(currentPacketId)
                                                                    setAllowHijackCurrentResponse(true)
                                                                } else {
                                                                    setAllowHijackCurrentResponse(false)
                                                                }
                                                            }}>
                                                            ???????????? {
                                                            allowHijackCurrentResponse &&
                                                            <CheckOutlined/>
                                                        }
                                                        </Button>}
                                                </Space>
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{width: "100%", textAlign: "right"}}>
                                                <Space>
                                                    {!autoForward && <div>
                                                        <span style={{marginRight: 4}}>????????????:</span>
                                                        <Checkbox checked={hijackAllResponse} onClick={e => {
                                                            if (!hijackAllResponse) {
                                                                info("????????????????????????")
                                                            } else {
                                                                info("???????????????")
                                                            }
                                                            setHijackAllResponse(!hijackAllResponse)
                                                        }}/>
                                                    </div>}
                                                    {setFilter()}
                                                    <SelectOne
                                                        data={[
                                                            {text: "????????????", value: false},
                                                            {text: "????????????", value: true},
                                                        ]}
                                                        value={autoForward}
                                                        formItemStyle={{marginBottom: 0}}
                                                        setValue={e => {
                                                            if (e) {
                                                                info("????????????????????????????????????????????????")
                                                                setHijackAllResponse(false)
                                                            } else {
                                                                info("????????????????????????????????????????????????")
                                                            }
                                                            setAutoForward(e)
                                                            if (currentPacket && currentPacketId) {
                                                                forward()
                                                            }
                                                        }}
                                                    />
                                                    {/*<div>*/}
                                                    {/*    <span>???????????????</span>*/}
                                                    {/*    <Switch*/}
                                                    {/*        checked={autoForward}*/}
                                                    {/*        onChange={e => {*/}
                                                    {/*        }}*/}
                                                    {/*    />*/}
                                                    {/*</div>*/}
                                                </Space>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col span={12}>
                                            <div style={{
                                                width: "100%", textAlign: "left", height: '100%',
                                                display: 'flex'
                                            }}>{autoForward ?
                                                <Text style={{alignSelf: 'center'}}>
                                                    {`????????????????????????...`}</Text> :
                                                <>
                                                    <Text title={urlInfo} ellipsis={true} style={{
                                                        alignSelf: 'center',
                                                        maxWidth: 300
                                                    }}>{status === 'hijacking' ? '??????????????????...' : `?????????${urlInfo}`}</Text>
                                                    {ipInfo && status !== 'hijacking' &&
                                                    <Tag color='green' title={ipInfo} style={{
                                                        marginLeft: 5,
                                                        alignSelf: 'center',
                                                        maxWidth: 140
                                                    }}>{`${ipInfo}`}</Tag>}
                                                </>
                                            }
                                            </div>
                                        </Col>
                                        <Col span={12}>
                                            <div style={{width: "100%", textAlign: "right"}}>
                                                <Button
                                                    type={"link"} onClick={() => recover()}
                                                    icon={<ReloadOutlined/>}
                                                >????????????</Button>
                                            </div>
                                        </Col>
                                    </Row>
                                </PageHeader>
                                <div style={{flex: 1}}>
                                    {/*<Spin wrapperClassName={"mitm-loading-spin"} spinning={status === "hijacking"}>*/}
                                    <div style={{height: "100%"}}>
                                        <HTTPPacketEditor
                                            originValue={currentPacket}
                                            noHeader={true} bordered={false}
                                            onChange={setModifiedPacket}
                                            noPacketModifier={true}
                                            readOnly={status === "hijacking"}
                                            refreshTrigger={(forResponse ? `rsp` : `req`) + `${currentPacketId}`}
                                            actions={forResponse ? [
                                                {
                                                    id: "forward-response",
                                                    label: "????????? HTTP Response",
                                                    run: function () {
                                                        hijacking()
                                                        forwardResponse(getCurrentId()).finally(() => {
                                                            setTimeout(() => setLoading(false), 300)
                                                        })
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                                {
                                                    id: "drop-response",
                                                    label: "????????? HTTP Response",
                                                    run: function () {
                                                        hijacking()
                                                        dropResponse(getCurrentId()).finally(() => {
                                                            setTimeout(() => setLoading(false), 300)
                                                        })
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                            ] : [
                                                {
                                                    id: "send-to-fuzzer",
                                                    label: "????????? Web Fuzzer",
                                                    run: function (StandaloneEditor: any) {
                                                        props.onSendToWebFuzzer && props.onSendToWebFuzzer(true, StandaloneEditor.getModel().getValue())
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                                {
                                                    id: "forward-response",
                                                    label: "????????? HTTP Request",
                                                    run: function () {
                                                        hijacking()
                                                        forwardRequest(getCurrentId()).finally(() => {
                                                            setTimeout(() => setLoading(false), 300)
                                                        })
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                                {
                                                    id: "drop-response",
                                                    label: "????????? HTTP Request",
                                                    run: function () {
                                                        hijacking()
                                                        dropRequest(getCurrentId()).finally(() => {
                                                            setTimeout(() => setLoading(false), 300)
                                                        })
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                                {
                                                    id: "hijack-current-response",
                                                    label: "????????? Request ???????????????",
                                                    run: function () {
                                                        allowHijackedResponseByRequest(getCurrentId())
                                                    },
                                                    contextMenuGroupId: "Actions"
                                                },
                                            ]}
                                        />
                                    </div>
                                    {/*</Spin>*/}
                                </div>
                            </Col>
                            {haveSideCar && <Col span={9} style={{height: "100%"}}>
                                <div style={{height: "100%"}}>
                                    <MITMPluginCard
                                        autoUpdate={!passiveMode}
                                        messages={logs} hooks={mitmHooks}
                                        onSubmitScriptContent={e => {
                                            ipcRenderer.invoke("mitm-exec-script-content", e)
                                        }}
                                        onSubmitYakScriptId={(id: number, params: YakExecutorParam[]) => {
                                            info(`?????? MITM ??????[${id}]`)
                                            ipcRenderer.invoke("mitm-exec-script-by-id", id, params)
                                        }}
                                        onSendToWebFuzzer={props.onSendToWebFuzzer}
                                    />
                                </div>
                            </Col>}
                        </Row>}
                    </div>
                default:
                    return <div/>
            }
        })()}
    </div>
};