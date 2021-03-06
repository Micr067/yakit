import React, {useEffect, useState} from "react"
import {Button, Card, Checkbox, Col, Form, Input, Row, Space, Tag, Upload} from "antd"
import {ReloadOutlined, UploadOutlined} from "@ant-design/icons"
import {InputInteger, InputItem, SwitchItem} from "../../utils/inputUtil"
import {randomString} from "../../utils/randomUtil"
import {PluginResultUI} from "../yakitStore/viewers/base"
import {warn, failed} from "../../utils/notification"
import {showModal} from "../../utils/showModal"

import {AutoCard} from "../../components/AutoCard"
import useHoldingIPCRStream from "../../hook/useHoldingIPCRStream"
import {SelectItem} from "../../utils/SelectItem"

const {ipcRenderer} = window.require("electron")

export interface StartBruteParams {
    Type: string
    Targets: string
    TargetFile?: string
    Usernames?: string[]
    UsernamesDict?: string[]
    UsernameFile?: string
    ReplaceDefaultUsernameDict?: boolean
    Passwords?: string[]
    PasswordsDict?: string[]
    PasswordFile?: string
    ReplaceDefaultPasswordDict?: boolean

    Prefix?: string

    Concurrent?: number
    TargetTaskConcurrent?: number

    OkToStop?: boolean
    DelayMin?: number
    DelayMax?: number

    PluginScriptName?: string

    usernameValue?: string
    passwordValue?: string
}

export interface BrutePageProp {
}

export const BrutePage: React.FC<BrutePageProp> = (props) => {
    const [typeLoading, setTypeLoading] = useState(false)
    const [availableTypes, setAvailableTypes] = useState<string[]>([])
    const [selectedType, setSelectedType] = useState<string[]>([])
    const [targetTextRow, setTargetTextRow] = useState(false)
    const [allowTargetFileUpload, setAllowTargetFileUpload] = useState(false)
    const [advanced, setAdvanced] = useState(false)
    const [taskToken, setTaskToken] = useState(randomString(40))

    const [loading, setLoading] = useState(false)

    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream("brute", "StartBrute", taskToken, () => {
        setTimeout(() => setLoading(false), 300)
    })

    // params
    const [params, setParams] = useState<StartBruteParams>({
        Concurrent: 50,
        DelayMax: 5,
        DelayMin: 1,
        OkToStop: true,
        PasswordFile: "",
        Passwords: [],
        PasswordsDict: [],
        ReplaceDefaultPasswordDict: false,
        PluginScriptName: "",
        Prefix: "",
        TargetFile: "",
        TargetTaskConcurrent: 1,
        Targets: "",
        Type: "",
        UsernameFile: "",
        Usernames: [],
        UsernamesDict: [],
        ReplaceDefaultUsernameDict: false,

        usernameValue: "",
        passwordValue: ""
    })

    useEffect(() => {
        setParams({...params, Type: selectedType.join(",")})
    }, [selectedType])

    const loadTypes = () => {
        setTypeLoading(true)
        ipcRenderer
            .invoke("GetAvailableBruteTypes")
            .then((d: { Types: string[] }) => {
                const types = d.Types.sort((a, b) => a.localeCompare(b))
                setAvailableTypes(types)

                if (selectedType.length <= 0 && d.Types.length > 0) {
                    setSelectedType([types[0]])
                }
            })
            .catch((e: any) => {
            })
            .finally(() => setTimeout(() => setTypeLoading(false), 300))
    }

    useEffect(() => {
        if (availableTypes.length <= 0) loadTypes()
    }, [])

    return (
        <div style={{height: "100%", backgroundColor: "#fff", width: "100%", display: "flex"}}>
            <div style={{height: "100%", width: 200}}>
                <Card
                    loading={typeLoading}
                    size={"small"}
                    style={{marginRight: 8, height: "100%"}}
                    bodyStyle={{padding: 8}}
                    title={
                        <div>
                            ??????????????????{" "}
                            <Button
                                type={"link"}
                                size={"small"}
                                icon={<ReloadOutlined/>}
                                onClick={() => {
                                    loadTypes()
                                }}
                            />
                        </div>
                    }
                >
                    <Checkbox.Group
                        value={selectedType}
                        style={{marginLeft: 4}}
                        onChange={(checkedValue) => setSelectedType(checkedValue as string[])}
                    >
                        {availableTypes.map((item) => (
                            <Row key={item}>
                                <Checkbox value={item}>{item}</Checkbox>
                            </Row>
                        ))}
                    </Checkbox.Group>
                </Card>
            </div>
            <div style={{flex: 1, width: "100%", display: "flex", flexDirection: "column"}}>
                <Row style={{marginBottom: 30, marginTop: 35}}>
                    <Col span={3}/>
                    <Col span={17}>
                        <Form
                            onSubmitCapture={(e) => {
                                e.preventDefault()

                                if (!params.Targets && !params.TargetFile) {
                                    failed("?????????????????????")
                                    return
                                }

                                if (!params.Type) {
                                    failed("?????????????????????????????????")
                                    return
                                }

                                const info = JSON.parse(JSON.stringify(params))
                                info.Usernames = (info.Usernames || []).concat(info.UsernamesDict || [])
                                delete info.UsernamesDict
                                info.Passwords = (info.Passwords || []).concat(info.PasswordsDict || [])
                                delete info.PasswordsDict

                                info.Targets = info.Targets.split(",").join("\n")

                                reset()
                                setLoading(true)

                                setTimeout(() => {
                                    ipcRenderer.invoke("StartBrute", info, taskToken)
                                }, 300)
                            }}
                            style={{width: "100%", textAlign: "center", alignItems: "center"}}
                        >
                            <Space direction={"vertical"} style={{width: "100%"}} size={4}>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center"
                                    }}
                                >
                                    <span style={{marginRight: 8}}>????????????: </span>
                                    <Form.Item required={true} style={{marginBottom: 0, flex: "1 1 0px"}}>
                                        {targetTextRow ? (
                                            <Input.TextArea/>
                                        ) : (
                                            <Row
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    flexDirection: "row"
                                                }}
                                            >
                                                <Input
                                                    style={{marginRight: 8, height: 42, flex: 1}}
                                                    value={params.Targets}
                                                    allowClear={true}
                                                    placeholder={
                                                        "???????????? ??????(:??????)/IP(:??????)/IP???????????????????????????????????????????????????"
                                                    }
                                                    suffix={
                                                        <UploadOutlined
                                                            style={{
                                                                cursor: "pointer",
                                                                color: "#1890ff"
                                                            }}
                                                            onClick={(e) => {
                                                                showModal({
                                                                    title: "????????????????????????",
                                                                    width: "50%",
                                                                    content: (
                                                                        <>
                                                                            <UploadTarget
                                                                                defaultParams={params}
                                                                                setParams={setParams}
                                                                            />
                                                                        </>
                                                                    )
                                                                })
                                                            }}
                                                        />
                                                    }
                                                    onChange={(e) => {
                                                        setParams({
                                                            ...params,
                                                            Targets: e.target.value
                                                        })
                                                    }}
                                                />
                                                {loading ? (
                                                    <Button
                                                        style={{height: 42, width: 180}}
                                                        type={"primary"}
                                                        onClick={() => {
                                                            ipcRenderer.invoke("cancel-StartBrute", taskToken)
                                                        }}
                                                        danger={true}
                                                    >
                                                        ??????????????????
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        style={{height: 42, width: 180}}
                                                        type={"primary"}
                                                        htmlType={"submit"}
                                                    >
                                                        ????????????
                                                    </Button>
                                                )}
                                            </Row>
                                        )}
                                    </Form.Item>
                                </div>
                                <div style={{textAlign: "left", width: "100%", marginLeft: 68}}>
                                    <Space>
                                        <Tag>????????????:{params.Concurrent}</Tag>
                                        {(params?.TargetTaskConcurrent || 1) > 1 && (
                                            <Tag>?????????????????????:{params.TargetTaskConcurrent}</Tag>
                                        )}
                                        {params?.OkToStop ? <Tag>?????????????????????</Tag> : <Tag>????????????????????????</Tag>}
                                        {(params?.DelayMax || 0) > 0 && (
                                            <Tag>
                                                ????????????:{params.DelayMin}-{params.DelayMax}s
                                            </Tag>
                                        )}
                                        <Button
                                            type={"link"}
                                            size={"small"}
                                            onClick={(e) => {
                                                showModal({
                                                    title: "??????????????????",
                                                    width: "50%",
                                                    content: (
                                                        <>
                                                            <BruteParamsForm
                                                                defaultParams={params}
                                                                setParams={setParams}
                                                            />
                                                        </>
                                                    )
                                                })
                                            }}
                                        >
                                            ????????????
                                        </Button>
                                    </Space>
                                </div>
                                {advanced && (
                                    <div style={{textAlign: "left"}}>
                                        <Form
                                            onSubmitCapture={(e) => e.preventDefault()}
                                            size={"small"}
                                            layout={"inline"}
                                        >
                                            <SwitchItem
                                                label={"????????????"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                            <InputItem
                                                label={"????????????"}
                                                style={{marginBottom: 0}}
                                                suffix={
                                                    <Button size={"small"} type={"link"}>
                                                        ????????????
                                                    </Button>
                                                }
                                            />
                                            <InputItem
                                                label={"????????????"}
                                                style={{marginBottom: 0}}
                                                suffix={
                                                    <Button size={"small"} type={"link"}>
                                                        ????????????
                                                    </Button>
                                                }
                                            />
                                            <InputInteger
                                                label={"????????????"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                            <InputInteger
                                                label={"????????????"}
                                                setValue={() => {
                                                }}
                                                formItemStyle={{marginBottom: 0}}
                                            />
                                        </Form>
                                    </div>
                                )}
                            </Space>
                        </Form>
                    </Col>
                </Row>
                {/*<Row style={{marginBottom: 8}}>*/}
                {/*    <Col span={24}>*/}
                {/*        */}
                {/*    </Col>*/}
                {/*</Row>*/}
                <AutoCard style={{flex: 1, overflow: "auto"}} bodyStyle={{padding: 10}}>
                    <PluginResultUI
                        // script={script}
                        loading={loading}
                        progress={infoState.processState}
                        results={infoState.messageSate}
                        statusCards={infoState.statusState}
                        onXtermRef={setXtermRef}
                    />
                </AutoCard>
            </div>
        </div>
    )
}

interface BruteParamsFormProp {
    defaultParams: StartBruteParams
    setParams: (p: StartBruteParams) => any
}

const BruteParamsForm: React.FC<BruteParamsFormProp> = (props) => {
    const [params, setParams] = useState<StartBruteParams>(props.defaultParams)

    useEffect(() => {
        if (!params) {
            return
        }
        props.setParams({...params})
    }, [params])

    return (
        <Form
            onSubmitCapture={(e) => {
                e.preventDefault()
            }}
            labelCol={{span: 5}}
            wrapperCol={{span: 14}}
        >
            <SelectItem
                style={{marginBottom: 10}}
                label={"??????????????????"}
                value={params.usernameValue || ""}
                onChange={(value, dict) => {
                    if (!dict && (params.Usernames || []).length === 0) {
                        setParams({
                            ...params,
                            usernameValue: value,
                            UsernamesDict: [],
                            ReplaceDefaultUsernameDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            usernameValue: value,
                            UsernamesDict: dict ? dict.split("\n") : []
                        })
                    }
                }}
            />

            <InputItem
                style={{marginBottom: 5}}
                label={"????????????"}
                setValue={(Usernames) => {
                    if ((params.UsernamesDict || []).length === 0 && !Usernames) {
                        setParams({
                            ...params,
                            Usernames: [],
                            ReplaceDefaultUsernameDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            Usernames: Usernames ? Usernames.split("\n") : []
                        })
                    }
                }}
                value={(params?.Usernames || []).join("\n")}
                textarea={true}
                textareaRow={5}
            />

            <Form.Item label={" "} colon={false} style={{marginBottom: 5}}>
                <Checkbox
                    checked={!params.ReplaceDefaultUsernameDict}
                    onChange={(e) => {
                        if ((params.UsernamesDict || []).length === 0 && (params.Usernames || []).length === 0) {
                            warn("????????????????????????????????????")
                            setParams({
                                ...params,
                                ReplaceDefaultUsernameDict: false
                            })
                        } else {
                            setParams({
                                ...params,
                                ReplaceDefaultUsernameDict: !params.ReplaceDefaultUsernameDict
                            })
                        }
                    }}
                ></Checkbox>
                &nbsp;
                <span style={{color: "rgb(100,100,100)"}}>??????????????????????????????</span>
            </Form.Item>

            <SelectItem
                style={{marginBottom: 10}}
                label={"??????????????????"}
                value={params.passwordValue || ""}
                onChange={(value, dict) => {
                    if (!dict && (params.Passwords || []).length === 0) {
                        setParams({
                            ...params,
                            passwordValue: value,
                            PasswordsDict: [],
                            ReplaceDefaultPasswordDict: false
                        })
                    } else {
                        setParams({
                            ...params,
                            passwordValue: value,
                            PasswordsDict: dict ? dict.split("\n") : []
                        })
                    }
                }}
            />
            <InputItem
                style={{marginBottom: 5}}
                label={"????????????"}
                setValue={(item) => {
                    if ((params.PasswordsDict || []).length === 0 && !item) {
                        setParams({
                            ...params,
                            Passwords: [],
                            ReplaceDefaultPasswordDict: false
                        })
                    } else {
                        setParams({...params, Passwords: item ? item.split("\n") : []})
                    }
                }}
                value={(params?.Passwords || []).join("\n")}
                textarea={true}
                textareaRow={5}
            />

            <Form.Item label={" "} colon={false} style={{marginBottom: 5}}>
                <Checkbox
                    checked={!params.ReplaceDefaultPasswordDict}
                    onChange={(e) => {
                        if ((params.PasswordsDict || []).length === 0 && (params.Passwords || []).length === 0) {
                            warn("????????????????????????????????????")
                            setParams({
                                ...params,
                                ReplaceDefaultPasswordDict: false
                            })
                        } else {
                            setParams({
                                ...params,
                                ReplaceDefaultPasswordDict: !params.ReplaceDefaultPasswordDict
                            })
                        }
                    }}
                ></Checkbox>
                &nbsp;
                <span style={{color: "rgb(100,100,100)"}}>??????????????????????????????</span>
            </Form.Item>

            <InputInteger
                label={"????????????"}
                help={"???????????? n ?????????"}
                value={params.Concurrent}
                setValue={(e) => setParams({...params, Concurrent: e})}
            />
            <InputInteger
                label={"???????????????"}
                help={"??????????????????????????????????????????"}
                value={params.TargetTaskConcurrent}
                setValue={(e) => setParams({...params, TargetTaskConcurrent: e})}
            />
            <SwitchItem
                label={"????????????"}
                help={"??????????????????????????????????????????"}
                setValue={(OkToStop) => setParams({...params, OkToStop})}
                value={params.OkToStop}
            />
            <InputInteger
                label={"????????????"}
                max={params.DelayMax}
                min={0}
                setValue={(DelayMin) => setParams({...params, DelayMin})}
                value={params.DelayMin}
            />
            <InputInteger
                label={"????????????"}
                setValue={(DelayMax) => setParams({...params, DelayMax})}
                value={params.DelayMax}
                min={params.DelayMin}
            />
        </Form>
    )
}

interface UploadTargetProps {
    defaultParams: StartBruteParams
    setParams: (p: StartBruteParams) => any
}

const UploadTarget: React.FC<UploadTargetProps> = (props) => {
    const [targets, setTargets] = useState<string>(props.defaultParams.Targets.split(",").join("\n"))

    useEffect(() => {
        if (!targets) {
            return
        }

        const str = targets.split("\n").join(",")
        props.setParams({
            ...props.defaultParams,
            Targets: str.endsWith(",") ? str.substring(0, str.length - 1) : str
        })
    }, [targets])

    return (
        <Upload.Dragger
            className='targets-upload-dragger'
            accept={"text/plain"}
            multiple={false}
            maxCount={1}
            showUploadList={false}
            beforeUpload={(f) => {
                if (f.type !== "text/plain") {
                    failed(`${f.name}???txt??????????????????txt???????????????`)
                    return false
                }

                ipcRenderer.invoke("fetch-file-content", (f as any).path).then((res) => {
                    setTargets(res)
                })
                return false
            }}
        >
            <InputItem
                label={"????????????"}
                setValue={(value) => setTargets(value)}
                value={targets}
                textarea={true}
                textareaRow={9}
                isBubbing={true}
                help={
                    <div>
                        ??????(:??????)/IP(:??????)/IP???????????????????????????
                        <br/>
                        ??????TXT?????????????????????
                        <span style={{color: "rgb(25,143,255)"}}>????????????</span>??????
                    </div>
                }
            />
        </Upload.Dragger>
    )
}
