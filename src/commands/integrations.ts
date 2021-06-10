import { InjectableClass, InjectProperty } from "@codecapers/fusion";
import { IOpsgenieCommand, IOpsgenieCommandDesc } from "../lib/opsgenie-command";
import { IConfiguration_id, IConfiguration } from "../services/configuration";
import { ILog_id, ILog } from "../services/log";
import axios from "axios";
import chalk = require("chalk");
import { OutputStream } from "../lib/output-stream";

@InjectableClass()
export class IntegrationsCommand implements IOpsgenieCommand {

    @InjectProperty(IConfiguration_id)
    configuration!: IConfiguration;

    @InjectProperty(ILog_id)
    log!: ILog;

    async invoke(): Promise<void> {
        const apiKey = process.env.OPSGENIE_API_KEY;
        if (!apiKey) {
            throw new Error(`Please set environment variable OPSGENIE_API_KEY to your API key.`);
        }

        const options = {
            headers: {
                "Authorization": `GenieKey ${apiKey}`,
            },
        };

        const subCommand = this.configuration.getMainCommand();
        if (subCommand === undefined) {
            const listResponse = await axios.get(`https://api.opsgenie.com/v2/integrations`, options);
            const integrations = listResponse.data.data;
    
            const outputStream = new OutputStream();
            outputStream.start();
            outputStream.add(integrations);
            outputStream.end();
        }
        else if (subCommand === "enable") {
            this.configuration.consumeMainCommand();
            const integrationId = this.configuration.getMainCommand();
            if (integrationId === undefined) {
                throw new Error(`Expected integration id like this: opsgenie integrations enable <integration-id>`);
            }

            await axios.post(`https://api.opsgenie.com/v2/integrations/${integrationId}/enable`, {}, options);

            this.log.info("Disabled integration.");
        }
        else if (subCommand === "disable") {
            this.configuration.consumeMainCommand();
            const integrationId = this.configuration.getMainCommand();
            if (integrationId === undefined) {
                throw new Error(`Expected integration id like this: opsgenie integrations enable <integration-id>`);
            }

            await axios.post(`https://api.opsgenie.com/v2/integrations/${integrationId}/disable`, {}, options);

            this.log.info("Disabled integration.");
        }
        else {
            throw new Error(`"${subCommand}" is an unexpected sub command for command "integrations"`);
        }       

    }
}

const command: IOpsgenieCommandDesc = {
    name: "integrations",
    description: "Retrieves opsgenie integrations.",
    constructor: IntegrationsCommand,
    help: {
        usage: "opsgenie integrations",
        message: "Prints open Opsgenie integrations to the terminal.",
        arguments: [
        ],
    }
};

export default command;