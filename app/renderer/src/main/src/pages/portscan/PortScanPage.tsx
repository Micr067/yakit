import React, {useEffect, useRef, useState} from "react";
import {Button, Col, Divider, Empty, Form, Row, Select, Slider, Space, Spin, Switch, Tabs, Tag, Upload} from "antd";
import {CopyableField, InputItem, ManySelectOne, SelectOne, SwitchItem} from "../../utils/inputUtil";
import {randomString} from "../../utils/randomUtil";
import {ExecResult} from "../invoker/schema";
import {failed, info} from "../../utils/notification";
import {XTerm} from "xterm-for-react";
import {writeExecResultXTerm, xtermClear, xtermFit} from "../../utils/xtermUtils";
import {ClosedPortTableViewer, OpenPortTableViewer} from "./PortTable";
import {ExtractExecResultMessageToYakitPort, YakitPort} from "../../components/yakitLogSchema";
import {PortAssetDescription, PortAssetTable} from "../assetViewer/PortAssetPage";
import {PortAsset} from "../assetViewer/models";
import {InboxOutlined} from "@ant-design/icons";
import {PresetPorts} from "./schema";

import './PortScanPage.css'


const {ipcRenderer} = window.require("electron");

export interface PortScanPageProp {

}

export interface PortScanParams {
    Targets: string
    Ports: string
    Mode: "syn" | "fingerprint" | "all",
    Proto: ("tcp" | "udp")[],
    Concurrent: number,
    Active: boolean
    FingerprintMode: "service" | "web" | "all"
    SaveToDB: boolean
    SaveClosedPorts: boolean
    TargetsFile?: string
}

export const PortScanPage: React.FC<PortScanPageProp> = (props) => {
    const [params, setParams] = useState<PortScanParams>({
        Ports: "22,443,445,80,8000-8004,3306,3389,5432,8080-8084,7000-7005", Mode: "fingerprint",
        Targets: "",
        Active: true,
        Concurrent: 50,
        FingerprintMode: "all",
        Proto: ["tcp"],
        SaveClosedPorts: false,
        SaveToDB: true
    });
    const [loading, setLoading] = useState(false);
    const [resettingData, setResettingData] = useState(false);
    const [token, setToken] = useState("");
    const xtermRef = useRef(null);
    const [resetTrigger, setResetTrigger] = useState(false);
    const [openPorts, setOpenPorts] = useState<YakitPort[]>([]);
    const [closedPorts, setClosedPorts] = useState<YakitPort[]>([]);
    const [port, setPort] = useState<PortAsset>();
    const [advanced, setAdvanced] = useState(false);

    const [uploadLoading,setUploadLoading]=useState(false)

    useEffect(() => {
        if (xtermRef) xtermFit(xtermRef, 128, 10);
    });

    useEffect(() => {
        if (!xtermRef) {
            return
        }

        const token = randomString(40);
        setToken(token)

        const openPorts: YakitPort[] = [];
        const closedPorts: YakitPort[] = [];
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let messageJsonRaw = Buffer.from(data.Message).toString("utf8");
                    let logInfo = ExtractExecResultMessageToYakitPort(JSON.parse(messageJsonRaw));
                    if (!logInfo) {
                        return
                    }
                    if (logInfo.isOpen) {
                        openPorts.unshift(logInfo)
                    } else {
                        closedPorts.unshift(logInfo)
                    }
                } catch (e) {
                    failed("??????????????????????????????...")
                }
            }
            writeExecResultXTerm(xtermRef, data)
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[PortScan] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info("[PortScan] finished")
            setLoading(false)
        })

        const syncPorts = () => {
            if (openPorts) setOpenPorts([...openPorts]);
            if (closedPorts) setClosedPorts([...closedPorts]);
        }
        let id = setInterval(syncPorts, 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.invoke("cancel-PortScan", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [xtermRef, resetTrigger])

    return <div>
        <Tabs>
            <Tabs.TabPane tab={"?????????????????????"} key={"scan"}>
                <Row gutter={12}>
                    <Col span={8} md={8} xxl={6}>
                        <Form
                            onSubmitCapture={e => {
                                e.preventDefault()

                                if (!token) {
                                    failed("No Token Assigned")
                                    return
                                }

                                if (params.Targets === "" && params.TargetsFile === "") {
                                    failed("????????????????????????")
                                    return;
                                }

                                setLoading(true)
                                ipcRenderer.invoke("PortScan", params, token)
                            }}
                            layout={"vertical"}
                        >
                            <Spin spinning={loading}>
                                <SelectOne label={"????????????"} data={[
                                    {value: "syn", text: "SYN"},
                                    {value: "fingerprint", text: "??????"},
                                    {value: "all", text: "SYN+??????"},
                                ]} help={"SYN ???????????? yak ???????????????root"}
                                           setValue={Mode => setParams({...params, Mode})} value={params.Mode}
                                />
                                <Upload.Dragger
                                    className='targets-upload-dragger'
                                    accept={'text/plain'}
                                    multiple={false} 
                                    maxCount={1}
                                    showUploadList={false}
                                    beforeUpload={ (f) => {
                                        if(f.type!=="text/plain"){
                                            failed(`${f.name}???txt??????????????????txt???????????????`)
                                            return false
                                        } 

                                        setUploadLoading(true)
                                        ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res)=>{
                                            setParams({...params, Targets:res})
                                            setTimeout(() => {
                                                setUploadLoading(false)
                                            }, 100);
                                        })
                                        return false
                                    }}>
                                        <Spin spinning={uploadLoading}>
                                        <InputItem label={"????????????"} setValue={Targets => setParams({...params, Targets})}
                                        value={params.Targets} textarea={true} textareaRow={6} isBubbing={true}
                                        help={<div>
                                            ??????/??????/IP/IP???????????????????????????????????????
                                            <br/>
                                            ??????TXT?????????????????????<span style={{color:'rgb(25,143,255)'}}>????????????</span>??????
                                        </div>}
                                        />
                                        </Spin>
                                </Upload.Dragger>
                                    
                                    <InputItem prefixNode={
                                    <div style={{margin: '5px 0'}}>
                                        ????????????
                                        <Select
                                        style={{width: 200,marginLeft: 5}}
                                        size={"small"} mode={"multiple"} bordered={true}
                                        onChange={(value: string[]) => {
                                            let res: string = (value || []).map(i => {
                                                // @ts-ignore
                                                return PresetPorts[i] || ""
                                            }).join(",");
                                            setParams({...params, Ports: res})
                                        }}
                                    >
                                        <Select.Option value={"top100"}>??????100??????</Select.Option>
                                        <Select.Option value={"top1000+"}>???????????????</Select.Option>
                                    </Select>
                                    </div>
                                    } 
                                    label={"???????????? ?????????????????????"} setValue={Ports => setParams({...params, Ports})}
                                           value={params.Ports} allowClear={true} textarea={true} autoSize={{minRows: 2, maxRows: 6}} help={<Space style={{marginTop: 4, marginBottom: 6}}>
                                </Space>}
                                />
                                <Form.Item label={"??????"}
                                           help={`??????????????????${params.Concurrent}?????????`} style={{width: "100%"}}
                                >
                                    <Slider
                                        style={{width: "90%"}}
                                        onChange={value => setParams({...params, Concurrent: value})}
                                        value={params.Concurrent}
                                        min={1} max={200}
                                    />
                                </Form.Item>
                                <Divider orientation={"left"}>???????????? <Switch size={"small"} checked={advanced}
                                                                           onChange={setAdvanced}/></Divider>
                                {advanced && <>
                                    {/*<MultiSelectForString*/}
                                    {/*    label={"??????"}*/}
                                    {/*    data={[*/}
                                    {/*        {value: "tcp", label: "TCP"},*/}
                                    {/*        {value: "udp", label: "UDP"},*/}
                                    {/*    ]}*/}
                                    {/*    setValue={Proto => setParams({...params, Proto: Proto.split(",") as any})}*/}
                                    {/*    value={params.Proto.join(",")}*/}
                                    {/*/>*/}
                                    <SwitchItem
                                        label={"????????????"} help={"??????????????????????????????"}
                                        setValue={Active => setParams({...params, Active})} value={params.Active}
                                    />
                                    <SwitchItem
                                        label={"??????????????????"}
                                        setValue={SaveToDB => {
                                            setParams({...params, SaveToDB, SaveClosedPorts: false})
                                        }} value={params.SaveToDB}
                                    />
                                    {params.SaveToDB && <SwitchItem
                                        label={"?????????????????????"}
                                        setValue={SaveClosedPorts => setParams({...params, SaveClosedPorts})}
                                        value={params.SaveClosedPorts}
                                    />}
                                    {
                                        params.Mode !== "syn" && <SelectOne
                                            label={"??????????????????"}
                                            data={[
                                                {value: "web", text: "???web??????"},
                                                {value: "service", text: "???nmap??????"},
                                                {value: "all", text: "????????????"},
                                            ]}
                                            setValue={FingerprintMode => setParams({...params, FingerprintMode})}
                                            value={params.FingerprintMode}
                                        />
                                    }
                                </>}
                            </Spin>

                            <Form.Item>
                                {loading ? <Button
                                        style={{
                                            width: "100%", height: 38,
                                        }}
                                        type="primary" danger={true}
                                        onClick={() => {
                                            ipcRenderer.invoke("cancel-PortScan", token)
                                        }}
                                    > ?????????????????? </Button> :
                                    <Button style={{
                                        width: "100%", height: 38,
                                    }} type="primary" htmlType="submit"> ?????????????????? </Button>}

                            </Form.Item>
                        </Form>
                    </Col>
                    <Col span={16} md={16} xxl={18}>
                        <div>
                            <Row>
                                <Col span={24} style={{marginBottom: 8}}>
                                    <div style={{
                                        textAlign: "right"
                                    }}>
                                        {loading ? <Tag color={"green"}>????????????...</Tag> : <Tag>
                                            ?????????...
                                        </Tag>}
                                        <Button disabled={resettingData || loading} size={"small"} onClick={e => {
                                            xtermClear(xtermRef);
                                            setResettingData(true)
                                            setResetTrigger(!resetTrigger)
                                            setTimeout(() => {
                                                setResettingData(false)
                                            }, 1200)
                                        }} type={"link"} danger={true}>??????????????????</Button>
                                    </div>
                                </Col>
                                <Col span={24}>
                                    <div style={{width: "100%", overflow: "auto"}}>
                                        <XTerm ref={xtermRef} options={{
                                            convertEol: true, disableStdin: true,
                                        }} onResize={r => xtermFit(xtermRef, r.cols, 10)}/>
                                    </div>
                                </Col>
                            </Row>
                            <Spin spinning={resettingData}>
                                <Row style={{marginTop: 6}} gutter={6}>
                                    <Col span={24}>
                                        <OpenPortTableViewer data={openPorts}/>
                                    </Col>
                                    {/*<Col span={8}>*/}
                                    {/*    <ClosedPortTableViewer data={closedPorts}/>*/}
                                    {/*</Col>*/}
                                </Row>
                            </Spin>
                        </div>
                    </Col>
                </Row>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"??????????????????"} key={"port"}>
                <Row gutter={12}>
                    <Col span={24}>
                        <PortAssetTable onClicked={(i) => {
                            setPort(i)
                        }}/>
                    </Col>
                    {/* <Col span={8}>
                        {port ? <PortAssetDescription port={port}/> : <Empty>
                            ??????????????????????????????
                        </Empty>}
                    </Col> */}
                </Row>
            </Tabs.TabPane>
        </Tabs>
    </div>
};