import { InjectableClass, InjectProperty } from "@codecapers/fusion";
import { IOpsgenieCommand, IOpsgenieCommandDesc } from "../lib/opsgenie-command";
import { IConfiguration_id, IConfiguration } from "../services/configuration";
import { ILog_id, ILog } from "../services/log";
import axios from "axios";
import chalk = require("chalk");

const pageSize = 100; // The max.

async function listAlerts(query: string, offset: number, apiKey: string, options: any): Promise<any[]> {
    try {
        const listResponse = await axios.get(`https://api.opsgenie.com/v2/alerts?offset=${offset}&limit=${pageSize}&query=${query}`, options);
        return listResponse.data.data;
    }
    catch (err) {
        console.error(`Failed to get alerts:`);
        console.error(err && err.stack || err);
        return [];
    }
}
@InjectableClass()
export class AlertsCommand implements IOpsgenieCommand {

    @InjectProperty(IConfiguration_id)
    configuration!: IConfiguration;

    @InjectProperty(ILog_id)
    log!: ILog;

    async invoke(): Promise<void> {
        const apiKey = process.env.OPSGENIE_API_KEY;
        if (!apiKey) {
            throw new Error(`Please set environment variable OPSGENIE_API_KEY to your API key.`);
        }

        const query = this.configuration.getArg("query") || "status: open";

        const options = {
            headers: {
                "Authorization": `GenieKey ${apiKey}`,
            },
        };

        this.log.output("[");

        const maxAlerts = 20000;
        let offset = 0;
        while (true) {
            const data = await listAlerts(query, offset, apiKey, options);
            if (data.length === 0) {
                break;
            }

            for (const alert of data) {
                if (offset > 0) {
                    this.log.output(",");
                }

                this.log.output(JSON.stringify(alert, null, 4));
            }
        
            offset += data.length;

            if (offset >= maxAlerts) {
                this.log.warn("Hit the maximum number of alerts that can be retreived from Opsgenie.");
                break;
            }
        }

        this.log.output("]");
    }
}

const command: IOpsgenieCommandDesc = {
    name: "alerts",
    description: "Retrieves opsgenie alerts.",
    constructor: AlertsCommand,
    help: {
        usage: "opsgenie alerts",
        message: "Prints open Opsgenie alerts to the terminal. By default it lists open alerts.",
        arguments: [
            ["--query", `Search query to apply while filtering the alerts. Default: "status: open". Query syntax help: ${chalk.blue("https://docs.opsgenie.com/v1.0/docs/alerts-search-query-help")}`]
        ],
    }
};

export default command;