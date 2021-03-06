import React, {useEffect, useState} from "react";
import {
    Typography,
    Button,
    PageHeader,
    Table,
    Tag,
    Space,
    Popconfirm,
    Row,
    Col,
    Card,
    Empty,
    Divider,
    Descriptions, Form, Modal
} from "antd";
import {showDrawer} from "../../utils/showModal";
import {YakScriptCreatorForm} from "./YakScriptCreator";
import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "./schema";
import {ReloadOutlined} from "@ant-design/icons";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {YakEditor} from "../../utils/editors";
import {YakScriptParamsSetter} from "./YakScriptParamsSetter";
import {InputItem, ManySelectOne, SelectOne} from "../../utils/inputUtil";
import {startExecuteYakScript} from "./ExecYakScript";
import {YakBatchExecutor} from "./batch/YakBatchExecutor";

export interface YakScriptManagerPageProp {
    type?: "yak" | "nuclei" | string
    keyword?: string
    limit?: number
    onLoadYakScript?: (s: YakScript) => any
    onlyViewer?: boolean
}

const {Text} = Typography;
const {ipcRenderer} = window.require("electron");

export const YakScriptManagerPage: React.FC<YakScriptManagerPageProp> = (props) => {
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [], Pagination: {
            Limit: props.limit || 15, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        },
        Total: 0
    });
    const [selectedScript, setSelectedScript] = useState<YakScript>();
    const {Data, Pagination, Total} = response;
    const [params, setParams] = useState<QueryYakScriptRequest>({
        Pagination: {
            Limit: props.limit || 15, Page: 1,
            Order: "desc", OrderBy: "updated_at"
        }, Type: props.type || undefined,
        Keyword: props.keyword || "", IsHistory: false
    });
    const [loading, setLoading] = useState(false);

    const isMainPage = !props.onLoadYakScript

    const update = (page?: number, limit?: number) => {
        const newParams = {
            ...params
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
        }, 3000)
        ipcRenderer.invoke("query-yak-script", newParams)
    };

    useEffect(() => {
        update(1)
    }, [params.Type])

    useEffect(() => {
        const handleData = (e: any, data: QueryYakScriptsResponse) => {
            setResponse(data)
            setTimeout(() => setLoading(false), 400)
        }
        const handleError = (e: any, data: any) => {
            failed(data)
            setTimeout(() => setLoading(false), 400)
        };
        ipcRenderer.on("client-query-yak-script-data", handleData);
        ipcRenderer.on("client-query-yak-script-error", handleError);

        update(1)
        return () => {
            ipcRenderer.removeListener("client-query-yak-script-data", handleData)
            ipcRenderer.removeListener("client-query-yak-script-error", handleError)
        }
    }, [])


    const renderTable = () => {
        return <Space direction={"vertical"} style={{width: "100%"}}>
            {!props.onlyViewer && <Form onSubmitCapture={e => {
                e.preventDefault()
                update(1)
            }} layout={"inline"}>
                <InputItem
                    label={"???????????????"}
                    setValue={Keyword => setParams({...params, Keyword})}
                    value={params.Keyword}
                />
                <Form.Item colon={false}>
                    <Button.Group>
                        <Button type="primary" htmlType="submit">??????</Button>
                        <Button onClick={e => {
                            if (!params.Keyword) {
                                Modal.error({title: "?????????????????????????????????????????????"});
                                return
                            }
                            showDrawer({
                                title: "", width: "93%", mask: false, keyboard: false,
                                content: <>
                                    <YakBatchExecutor
                                        keyword={params.Keyword || ""}
                                        verbose={`????????????????????????: ${params.Keyword}`}/>
                                </>,
                            })
                        }}>??????</Button>
                    </Button.Group>
                </Form.Item>
            </Form>}
            <Table<YakScript>
                size={"small"}
                dataSource={Data}
                rowKey={"Id"}
                loading={loading} bordered={true}
                scroll={{y: 750}}
                expandable={{
                    expandedRowRender: (i: YakScript) => {
                        return <div style={{height: 400}}>
                            <YakEditor
                                type={"yak"} readOnly={true} value={i.Content}
                            />
                        </div>
                    },
                }}
                onRow={isMainPage ? r => {
                    return {
                        onClick: () => {
                            setSelectedScript(r)
                        }
                    }
                } : undefined}
                pagination={{
                    size: "small",
                    pageSize: Pagination?.Limit || 10,
                    total: Total,
                    showTotal: (i) => <Tag>???{i}???????????????</Tag>,
                    // onChange(page: number, limit?: number): any {
                    //     update(page, limit)
                    // },
                }}
                onChange={(p) => {
                    update(p.current, p.pageSize)
                }}
                columns={isMainPage ? [
                    {
                        title: "????????????", width: 300,
                        render: (i: YakScript) => <Tag><Text
                            style={{maxWidth: 260}} copyable={true}
                            ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    // {
                    //     title: "??????", render: (i: YakScript) => <Text
                    //         style={{maxWidth: 300}}
                    //         ellipsis={{tooltip: true}}
                    //     >{i.Help}</Text>, width: 330,
                    // },
                    {
                        title: "??????", fixed: "right", width: 135, render: (i: YakScript) => <Space>
                            <Button size={"small"} onClick={e => {
                                let m = showDrawer({
                                    title: "???????????? Yak ??????", width: "90%", keyboard: false,
                                    content: <>
                                        <YakScriptCreatorForm
                                            modified={i} onChanged={i => update()}
                                            onCreated={(created) => {
                                                m.destroy()
                                            }}
                                        />
                                    </>
                                })
                            }}>??????</Button>
                            <Popconfirm
                                title={"??????????????????????????????"}
                                onConfirm={e => {
                                    ipcRenderer.invoke("delete-yak-script", i.Id)
                                    setLoading(true)
                                    setTimeout(() => update(1), 1000)
                                }}
                            >
                                <Button size={"small"} danger={true}>??????</Button>
                            </Popconfirm>
                        </Space>
                    },
                ] : [
                    {
                        title: "????????????", fixed: "left",
                        render: (i: YakScript) => <Tag><Text style={{maxWidth: 200}} copyable={true}
                                                             ellipsis={{tooltip: true}}>
                            {i.ScriptName}
                        </Text></Tag>
                    },
                    {
                        title: "??????", render: (i: YakScript) => <Text
                            style={{maxWidth: 200}}
                            ellipsis={{tooltip: true}}
                        >{i.Help}</Text>
                    },
                    {
                        title: "??????", fixed: "right", render: (i: YakScript) => <Space>
                            {props.onLoadYakScript && <Button size={"small"} onClick={e => {
                                props.onLoadYakScript && props.onLoadYakScript(i)
                            }} type={"primary"}>??????</Button>}
                        </Space>
                    },
                ]}
            />
        </Space>
    }

    return <div>
        {!props.onlyViewer && <PageHeader
            title={"Yak ???????????????"}
            subTitle={<Space>
                <Button
                    icon={<ReloadOutlined/>}
                    type={"link"}
                    onClick={() => {
                        update()
                    }}
                />
                {props.type ? undefined : <Form layout={"inline"}>
                    <ManySelectOne
                        formItemStyle={{marginBottom: 0, width: 200}}
                        label={"????????????"}
                        data={[
                            {value: "yak", text: "Yak ????????????"},
                            {value: "nuclei", text: "nuclei Yaml??????"},
                            {value: undefined, text: "??????"},
                        ]}
                        setValue={Type => setParams({...params, Type})} value={params.Type}
                    />
                </Form>}
                <div>
                    ???????????????????????? / ???????????? Yak ??????
                </div>
            </Space>}
            extra={[
                isMainPage ? <Popconfirm
                    title={<>
                        ????????????????????? nuclei poc ??????<br/>
                        ????????? <Text mark={true} copyable={true}>yak update-nuclei-poc</Text> ?????????????????? PoC
                    </>}
                    onConfirm={() => {
                        ipcRenderer.invoke("update-nuclei-poc")
                    }}
                >
                    <Button>?????? PoC(nuclei)</Button>
                </Popconfirm> : undefined,
                <Button type={"primary"} onClick={e => {
                    let m = showDrawer({
                        title: "???????????? Yakit ??????",
                        keyboard: false,
                        width: "95%",
                        content: <>
                            <YakScriptCreatorForm onCreated={() => {
                                m.destroy()
                            }} onChanged={e => update(1)}/>
                        </>
                    })
                }}>???????????????</Button>
            ]}
        />}
        {(isMainPage && !props.onlyViewer) ? <Row gutter={12}>
            <Col span={8}>
                {renderTable()}
            </Col>
            <Col span={16}>
                {selectedScript ? <YakScriptOperator script={selectedScript}/> : <Empty/>}
            </Col>
        </Row> : <Row>
            <Col span={24}>
                {renderTable()}
            </Col>
        </Row>}
    </div>
};

export interface YakScriptOperatorProp {
    script: YakScript
}

export const YakScriptOperator: React.FC<YakScriptOperatorProp> = (props) => {
    const {script} = props;

    return <Card title={<Space>
        <Text>{script.ScriptName}</Text>
        <Tag color={"geekblue"}>{script.Type}</Tag>
    </Space>}>
        <Descriptions bordered={true} column={2} labelStyle={{
            width: 100,
        }}>
            <Descriptions.Item span={2} label={<Space>
                <Tag><Text>{"????????????"}</Text></Tag>
            </Space>}>
                {script.Help}
            </Descriptions.Item>
            {script.Level && <Descriptions.Item label={<Space>
                <Tag><Text>{"????????????"}</Text></Tag>
            </Space>}>
                {script.Level}
            </Descriptions.Item>}
            {script.Author && <Descriptions.Item label={<Space>
                <Tag><Text>{"????????????"}</Text></Tag>
            </Space>}>
                {script.Author}
            </Descriptions.Item>}
            {script.Tags && <Descriptions.Item label={<Space>
                <Tag><Text>{"??????/?????????"}</Text></Tag>
            </Space>}>
                {script.Tags}
            </Descriptions.Item>}
        </Descriptions>
        <Divider/>
        <YakScriptParamsSetter
            submitVerbose={"???????????????"}
            {...script}
            params={[]}
            onParamsConfirm={r => {
                startExecuteYakScript(script, r)
            }}
        />
    </Card>
};