import React, {useEffect, useState} from "react";
import {Button, Space, Table, Tag} from "antd";
import {
    ExecHistoryRecord,
    genDefaultPagination,
    QueryGeneralRequest,
    QueryGeneralResponse,
    YakScript
} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {formatTimestamp} from "../../utils/timeUtil";
import {CopyableField} from "../../utils/inputUtil";
import {showModal} from "../../utils/showModal";
import {YakEditor} from "../../utils/editors";
import {ReloadOutlined} from "@ant-design/icons";

export interface PluginHistoryTableProp {
    trigger?: any
    script: YakScript,
}

interface QueryPluginHistoryParams extends QueryGeneralRequest {
    YakScriptId?: number
    YakScriptName?: string
}

const {ipcRenderer} = window.require("electron");

export const PluginHistoryTable: React.FC<PluginHistoryTableProp> = (props) => {
    const [params, setParams] = useState<QueryPluginHistoryParams>({
        Pagination: genDefaultPagination(10),
    });
    const [response, setResponse] = useState<QueryGeneralResponse<ExecHistoryRecord>>({
        Data: [],
        Pagination: genDefaultPagination(10),
        Total: 0
    })
    const [loading, setLoading] = useState(false);

    const update = (page?: number, limit?: number,) => {
        const newParams = {
            ...params,
            YakScriptId: props.script.Id,
            YakScriptName: props.script.ScriptName,
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        setLoading(true)
        console.info(newParams)
        ipcRenderer.invoke("QueryExecHistory", newParams).then(data => {
            setResponse(data)
        }).catch((e: any) => {
            failed("QueryExecHistory failed: " + `${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 200)
        })
    }

    useEffect(() => {
        update(1)
    }, [props.trigger])

    return <div>
        <Table<ExecHistoryRecord>
            size={"small"}
            title={() => {
                return <Space>
                    <div>{props.script.ScriptName} ?????????????????????</div>
                    <Button type={"link"} ghost={true} onClick={() => {
                        update()
                    }}><ReloadOutlined/> </Button>
                </Space>
            }}
            loading={loading}
            rowKey={(row)=>{return row.Timestamp}}
            dataSource={response.Data}
            pagination={{
                pageSize: response.Pagination.Limit,
                showSizeChanger: true,
                total: response.Total,
                pageSizeOptions: ["5", "10", "20"],
                onChange: update,
            }}
            scroll={{x: "auto"}}
            columns={[
                {
                    title: "????????????",
                    render: (i: ExecHistoryRecord) => <Tag>{formatTimestamp(i.Timestamp)}</Tag>,
                    width: 130,
                },
                {
                    title: "??????",
                    render: (r: ExecHistoryRecord) => <Tag color={"geekblue"}>{r.DurationMs}ms</Tag>,
                    width: 100,
                },
                {
                    title: "??????", width: 300,
                    render: (r: ExecHistoryRecord) => <CopyableField noCopy={!r.Params} text={r.Params} width={300}/>,
                },
                {
                    title: "??????", width: 120,
                    render: (r: ExecHistoryRecord) => r.Ok ? <Tag color={"green"}>????????????</Tag> :
                        <Tag color={"red"}>????????????</Tag>
                },
                {
                    title: "????????????/????????????", render: (r: ExecHistoryRecord) => r.Ok ? <Space>
                        {r.Stdout && <Tag color={"geekblue"}>????????????????????????[{(r.StdoutLen)}]</Tag>}
                        {r.Stderr && <Tag color={"orange"}>????????????????????????[{(r.StderrLen)}]</Tag>}
                        {!r.Stdout && !r.Stderr ? <Tag>?????????</Tag> : undefined}
                    </Space> : <Space>
                        <Tag color={"red"}>{r.Reason}</Tag>
                    </Space>
                },
                {
                    title: "??????", render: (r: ExecHistoryRecord) => <Space>
                        <Button size={"small"} onClick={() => {
                            showModal({
                                title: "????????????", content: <>
                                    <div style={{height: 500}}>
                                        <YakEditor type={"yak"} readOnly={true} value={props.script.Content}/>
                                    </div>
                                </>, width: "60%",
                            })
                        }}>????????????</Button>
                    </Space>
                },
            ]}
        >

        </Table>
    </div>
};