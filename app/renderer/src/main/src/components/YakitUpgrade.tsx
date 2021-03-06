import React, {useEffect, useState} from "react";
import {Alert, Button, Card, Modal, Popconfirm, Progress, Space, Spin, Tag} from "antd";
import {failed, success} from "../utils/notification";

const {ipcRenderer} = window.require("electron");

export interface YakitUpgradeProp {
    onFinished: () => any
}


interface DownloadingTime {
    elapsed: number;
    remaining: number;
}

interface DownloadingSize {
    total: number;
    transferred: number;
}

interface DownloadingState {
    time: DownloadingTime;
    speed: number;
    percent: number;
    size: DownloadingSize;
}


export const YakitUpgrade: React.FC<YakitUpgradeProp> = (props) => {
    const [currentVersion, setCurrentVersion] = useState("")
    const [loading, setLoading] = useState(false);
    const [latestLoading, setLatestLoading] = useState(false);
    const [latestVersion, setLatestVersion] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadingState>();

    const queryLatestVersion = () => {
        setLatestLoading(true)
        ipcRenderer.invoke("query-latest-yakit-version").then((data: string) => {
            if (data.startsWith("v")) {
                data = data.substr(1)
            }
            setLatestVersion(data)
        }).catch((e: any) => {
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLatestLoading(false), 300)
        )
    }

    const updateCurrent = () => {
        setLoading(true)
        ipcRenderer.invoke("yakit-version").then((data: string) => {
            setCurrentVersion(data)
        }).catch((e: any) => {
            failed(`${e}`)
        }).finally(
            () => setTimeout(() => setLoading(false), 300)
        )
    }

    useEffect(() => {
        ipcRenderer.on("download-yakit-engine-progress", async (e: any, state: DownloadingState) => {
            setDownloadProgress(state);
        })
        return () => {
            ipcRenderer.removeAllListeners("download-yakit-engine-progress")
        }
    }, [])


    useEffect(() => {
        updateCurrent()
        queryLatestVersion()

        // ipcRenderer.invoke("get-windows-install-dir").then(setWinPath).catch(() => {
        // }).finally()
    }, [])

    const install = (version: string) => {
        Modal.confirm({
            title: "Yakit ????????????",
            width: "50%",
            content: <>
                <Space direction={"vertical"}>
                    <Tag color={"purple"}>Yakit ?????????????????????</Tag>
                    <p/>
                    <Tag>?????? Ok/?????? ???????????? Yakit ??????????????????????????????????????????</Tag>
                    <Tag>?????? Cancel ???????????????????????????</Tag>
                    <br/>
                    <Tag>linux/macOs ?????????????????????~/yakit-projects/yak-engine</Tag>
                    <Tag>windows ?????????????????????%HOME%/yakit-projects/yak-engine</Tag>
                </Space>
            </>,
            onOk: () => {
                ipcRenderer.invoke("install-yakit", latestVersion).then(() => {
                }).catch((err: any) => {
                })
            }

        })
    }

    const isLatest = currentVersion === latestVersion;
    const color = isLatest ? "green" : "red";
    return <Card
        size={"small"} bodyStyle={{padding: 0}} bordered={false}
    >
        <Space direction={"vertical"} style={{width: "100%"}}>
            <Spin spinning={loading}>
                <Alert message={<Space>
                    ?????? Yakit ??????:
                    <Tag
                        color={color}
                    >{currentVersion}</Tag>
                    {isLatest ? <Tag color={"green"}>????????????</Tag> : <Tag
                        color={"red"}
                    >Yakit ????????????</Tag>}
                </Space>}/>
            </Spin>
            <Spin spinning={loading}>
                <Alert
                    type={"success"}
                    message={<Space>
                        Yakit ??????????????????
                        <Tag color={"green"}>{latestVersion}</Tag>
                    </Space>}/>
            </Spin>
            <Spin spinning={downloading}>
                <Space>
                    <Popconfirm
                        visible={(isLatest || loading || latestLoading) ? false : undefined}
                        title={`?????????????????????: ${latestVersion}`}
                        onConfirm={e => {
                            setDownloading(true)
                            ipcRenderer.invoke("download-latest-yakit", latestVersion).then(() => {
                                success("????????????")
                                install(latestVersion)
                            }).catch((e: any) => {
                                failed("????????????")
                            }).finally(() => {
                                setTimeout(() => setDownloading(false), 100)
                            })
                        }}
                    >
                        <Button
                            type={"primary"} disabled={isLatest || loading || latestLoading}
                        >
                            ????????????????????? Yakit
                        </Button>
                    </Popconfirm>
                    <Button type={"link"} onClick={() => {
                        install(latestVersion)
                    }}>??????????????????????????????</Button>
                </Space>
            </Spin>
            {downloadProgress && <Progress percent={
                downloading ? Math.floor((downloadProgress?.percent || 0) * 100) : 100
            }/>}
            {downloadProgress && downloading && <Space>
                <Tag>????????????:{downloadProgress?.time.remaining}</Tag>
                <Tag>???????????????:{downloadProgress?.time.elapsed}</Tag>
                <Tag>
                    ????????????:???{((downloadProgress?.speed || 0) / 1000000).toFixed(2)}M/s
                </Tag>
            </Space>}
        </Space>
    </Card>
};