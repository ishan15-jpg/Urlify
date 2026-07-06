import { createTransport, Transporter } from "nodemailer";

class NodemailerConfig {
    private static instance: NodemailerConfig;
    private transporter: Transporter;

    private constructor() {
        this.transporter = createTransport({
          host: process.env.SMTP_HOST || 'smtp.ethereal.email',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || undefined,
            pass: process.env.SMTP_PASS || undefined,
          },
        });
    }

    public static getInstance(){
        if(!NodemailerConfig.instance){
            NodemailerConfig.instance = new NodemailerConfig();
        }
        return NodemailerConfig.instance;
    }

    public getTransporter():Transporter{
        return this.transporter;
    }
};

export default NodemailerConfig.getInstance().getTransporter();