import React, {useEffect, useState} from "react"
import {Button, Divider, Empty, Form, PageHeader, Popconfirm, Popover, Space, Tabs, Tag, Tooltip} from "antd"
import {YakScript} from "../invoker/schema"
import {failed, success} from "../../utils/notification"
import {formatTimestamp} from "../../utils/timeUtil"
import {CopyableField, InputItem} from "../../utils/inputUtil"
import {YakEditor} from "../../utils/editors"
import {showDrawer, showModal} from "../../utils/showModal"
import {PluginExecutor} from "./PluginExecutor"
import {DocumentEditor} from "./DocumentEditor"
import MDEditor from "@uiw/react-md-editor"
import {PluginHistoryTable} from "./PluginHistory"
import {openABSFile} from "../../utils/openWebsite"
import {EditOutlined, QuestionOutlined} from "@ant-design/icons"
import {YakScriptCreatorForm} from "../invoker/YakScriptCreator"
import {YakScriptExecResultTable} from "../../components/YakScriptExecResultTable"

export interface YakScriptOperatorProp {
    yakScriptId: number
    size?: "big" | "small"
    fromMenu?: boolean
}

const {ipcRenderer} = window.require("electron")

export const PluginOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const [script, setScript] = useState<YakScript>()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [groups, setGroups] = useState<string[]>([])
    const [markdown, setMarkdown] = useState("")
    const [trigger, setTrigger] = useState(false)
    const [details, setDetails] = useState(true)

    const updateGroups = () => {
        ipcRenderer
            .invoke("QueryGroupsByYakScriptId", {YakScriptId: props.yakScriptId})
            .then((data: { Groups: string[] }) => {
                setGroups(data.Groups)
            })
            .catch((e: any) => {
                console.info(e)
            })
            .finally()
    }

    const update = () => {
        if (props.yakScriptId <= 0) {
            return
        }
        updateGroups()

        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptById", {Id: props.yakScriptId})
            .then((e: YakScript) => {
                setScript(e)
                // setDetails(!e.IsGeneralModule)

                ipcRenderer
                    .invoke("GetMarkdownDocument", {
                        YakScriptId: e?.Id,
                        YakScriptName: e?.ScriptName
                    })
                    .then((data: { Markdown: string }) => {
                        setMarkdown(data.Markdown)
                    })
                    .catch((e: any) => {
                        setMarkdown("")
                    })
            })
            .catch((e: any) => {
                failed("Query YakScript By ID failed")
            })
            .finally(() =>
                setTimeout(() => {
                    setTrigger(!trigger)
                    setLoading(false)
                }, 300)
            )
    }

    const defaultContent = () => {
        return <Tabs type={"card"} defaultValue={"runner"} tabPosition={"right"}>
            <Tabs.TabPane tab={"??????"} key={"runner"}>
                {script && <PluginExecutor
                    subTitle={<Space>
                        {script.Help && (
                            <Tooltip title={script.Help}>
                                <Button
                                    type={"link"}
                                    icon={<QuestionOutlined/>}
                                />
                            </Tooltip>
                        )}
                        <Space size={8}>
                            {/*{script?.ScriptName && (*/}
                            {/*    <Tag>{formatTimestamp(script?.CreatedAt)}</Tag>*/}
                            {/*)}*/}
                            <p style={{color: "#999999", marginBottom: 0}}>
                                ??????:{script?.Author}
                            </p>
                            {script?.Tags
                                ? (script?.Tags || "")
                                    .split(",")
                                    .filter((i) => !!i)
                                    .map((i) => {
                                        return <Tag
                                            style={{marginLeft: 2, marginRight: 0}}
                                            key={`${i}`}
                                            color={"geekblue"}
                                        >{i}</Tag>
                                    })
                                : "No Tags"}
                        </Space>
                    </Space>}
                    extraNode={(
                        !props.fromMenu && <Space>
                            {script && (
                                <Button
                                    onClick={(e) => {
                                        let m = showDrawer({
                                            title: "????????????",
                                            keyboard: false,
                                            width: "94%",
                                            onClose: () => {
                                                update()
                                                m.destroy()
                                            },
                                            content: (
                                                <>
                                                    <DocumentEditor
                                                        onFinished={() => {
                                                            m.destroy()
                                                        }}
                                                        markdown={markdown}
                                                        yakScript={script}
                                                    />
                                                </>
                                            )
                                        })
                                    }}
                                >
                                    ????????????
                                </Button>
                            )}
                            <Button
                                type={"primary"}
                                onClick={(e) => {
                                    let m = showDrawer({
                                        title: `????????????: ${script?.ScriptName}`,
                                        width: "100%",
                                        content: (
                                            <>
                                                <YakScriptCreatorForm
                                                    modified={script}
                                                    onChanged={(i) => update()}
                                                    onCreated={() => {
                                                        m.destroy()
                                                    }}
                                                />
                                            </>
                                        ),
                                        keyboard: false
                                    })
                                }}
                            >????????????</Button>
                        </Space>
                    )} primaryParamsOnly={true} script={script} size={props.size}/>}
            </Tabs.TabPane>
            <Tabs.TabPane tab={"??????"} key={"docs"}>
                {markdown ? <MDEditor.Markdown source={markdown}/> : <Empty
                    style={{marginTop: 80}}
                    description={"???????????????????????????"}/>}
            </Tabs.TabPane>
            <Tabs.TabPane tab={"??????"} key={"code"}>
                <div style={{height: 500}}>
                    <YakEditor
                        type={script?.Type || "yak"}
                        value={script?.Content}
                        readOnly={true}
                    />
                </div>
            </Tabs.TabPane>
            <Tabs.TabPane tab={"??????"} key={"history"}>
                {script && <PluginHistoryTable script={script} trigger={trigger}/>}
                {/*<ExecHistoryTable mini={false} trigger={null as any}/>*/}
            </Tabs.TabPane>
            <Tabs.TabPane tab={"??????"} key={"results"}>
                {script && (
                    <YakScriptExecResultTable
                        YakScriptName={script.ScriptName}
                        trigger={trigger}
                    />
                )}
            </Tabs.TabPane>
        </Tabs>
    }

    const showContent = (module: YakScript): JSX.Element => {
        if (!module) return <></>

        const key = module.GeneralModuleKey

        switch (key) {
            // case "basic-crawler":
            //     return (
            //         <BasicCrawlerModule
            //             pluginInfo={module}
            //             fromMenu={!!props.fromMenu}
            //             trigger={trigger}
            //             update={update}
            //             updateGroups={updateGroups}
            //         />
            //     )
            default:
                return defaultContent()
        }
    }

    useEffect(() => {
        update()
    }, [props.yakScriptId])

    return (
        <div style={{marginLeft: 16}}>
            {!!script && !!props.fromMenu ? (
                showContent(script)
            ) : (
                defaultContent()
            )}
        </div>
    )
}

export interface AddToMenuActionFormProp {
    script: YakScript
}

export const AddToMenuActionForm: React.FC<AddToMenuActionFormProp> = (props) => {
    const {script} = props

    const [params, setParams] = useState<{
        Group: string
        YakScriptId: number
        Verbose: string
    }>({Group: "????????????", Verbose: props.script.ScriptName, YakScriptId: props.script.Id})

    useEffect(() => {
        setParams({
            Group: "????????????",
            Verbose: props.script.ScriptName,
            YakScriptId: props.script.Id
        })
    }, [props.script])

    return (
        <div>
            <Form
                size={"small"}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    if (!script) {
                        failed("No Yak Modeule Selected")
                        return
                    }

                    ipcRenderer
                        .invoke("AddToMenu", params)
                        .then(() => {
                            success("????????????")
                        })
                        .catch((e: any) => {
                            failed(`${e}`)
                        })
                }}
            >
                <InputItem
                    label={"???????????????(????????????)"}
                    setValue={(Verbose) => setParams({...params, Verbose})}
                    value={params.Verbose}
                />
                <InputItem
                    label={"????????????"}
                    setValue={(Group) => setParams({...params, Group})}
                    value={params.Group}
                />
                <Form.Item colon={false} label={" "}>
                    <Button type='primary' htmlType='submit'>
                        {" "}
                        ??????{" "}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    )
}

interface PluginManagementProps {
    script: YakScript
    vertical?: boolean
    update?: () => any
    groups?: string[]
    updateGroups?: () => any
}

export const PluginManagement: React.FC<PluginManagementProps> = React.memo<PluginManagementProps>((props) => {
    const {script, groups} = props;
    const update = props?.update ? props.update : () => {
    }
    const updateGroups = props?.updateGroups ? props.updateGroups : () => {
    }

    return <Space direction={props.vertical ? "vertical" : "horizontal"}>
        <Button
            type={"link"}
            onClick={(e) => {
                let m = showDrawer({
                    title: `????????????: ${script?.ScriptName}`,
                    width: "100%",
                    content: (
                        <>
                            <YakScriptCreatorForm
                                modified={script}
                                onChanged={(i) => update()}
                                onCreated={() => {
                                    m.destroy()
                                }}
                            />
                        </>
                    ),
                    keyboard: false
                })
            }}
            icon={<EditOutlined/>} size={"small"}
        >????????????</Button>
        <Popover
            title={`???????????????????????????[${script?.Id}]`}
            content={
                <>{script && <AddToMenuActionForm script={script}/>}</>
            }
        >
            <Button size={"small"} type={"primary"}>
                ??????????????????
            </Button>
        </Popover>
        <Button
            size={"small"}
            danger={true}
            onClick={(e) => {
                let m = showModal({
                    title: "???????????????",
                    content: (
                        <Space direction={"vertical"}>
                            {(groups || []).map((element) => {
                                return (
                                    <Button
                                        onClick={() => {
                                            ipcRenderer
                                                .invoke(
                                                    "RemoveFromMenu",
                                                    {
                                                        YakScriptId:
                                                        script?.Id,
                                                        Group: element
                                                    }
                                                )
                                                .then(() => {
                                                    updateGroups()
                                                    m.destroy()
                                                })
                                                .catch((e: any) => {
                                                    console.info(e)
                                                })
                                                .finally()
                                        }}
                                    >
                                        ??? {element} ?????????
                                    </Button>
                                )
                            })}
                        </Space>
                    )
                })
            }}
        >
            ???????????????
        </Button>
        {script?.IsIgnore ? (
            <>
                <Popconfirm
                    title={"????????????????????????"}
                    onConfirm={() => {
                        ipcRenderer
                            .invoke("UnIgnoreYakScript", {
                                Id: script?.Id
                            })
                            .then((e) => {
                                success("???????????????")
                            })
                            .catch((e: any) => {
                            })
                            .finally(() => {
                            })
                    }}
                >
                    <Button size={"small"}>???????????? / ????????????</Button>
                </Popconfirm>
            </>
        ) : (
            <Popconfirm
                title={
                    "??????????????????????????????????????????????????????????????????????????????????????????"
                }
                onConfirm={() => {
                    ipcRenderer
                        .invoke("IgnoreYakScript", {Id: script?.Id})
                        .then((e) => {
                            success("???????????????")
                        })
                        .catch((e: any) => {
                        })
                        .finally(() => {
                        })
                }}
            >
                <Button size={"small"} danger={true}>
                    ???????????? / ??????
                </Button>
            </Popconfirm>
        )}
        <Popconfirm
            title={"???????????????????????????????????????????????????"}
            onConfirm={(e) => {
                ipcRenderer
                    .invoke("ExportYakScript", {
                        YakScriptId: script?.Id
                    })
                    .then((data: { OutputDir: string }) => {
                        showModal({
                            title: "????????????!",
                            content: (
                                <>
                                    <Space direction={"vertical"}>
                                        <CopyableField
                                            text={data.OutputDir}
                                        />
                                        <Button
                                            type={"link"}
                                            onClick={() => {
                                                openABSFile(
                                                    data.OutputDir
                                                )
                                            }}
                                        >
                                            ?????????????????????
                                        </Button>
                                    </Space>
                                </>
                            )
                        })
                    })
                    .catch((e: any) => {
                        console.info(e)
                    })
            }}
        >
            <Button size={"small"}>????????????</Button>
        </Popconfirm>
        <Popconfirm
            title={"???????????????????????????????????????????????????"}
            onConfirm={() => {
                ipcRenderer.invoke("delete-yak-script", script.Id)
                update()
                // setLoading(true)
                // setTimeout(() => setTrigger(!trigger), 300)
            }}
        >
            <Button size={"small"} danger={true} type={"link"}>????????????</Button>
        </Popconfirm>
    </Space>
});