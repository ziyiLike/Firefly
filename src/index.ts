import http from "http";
import FireflyExtends from "./extends";
import {IFY} from './types'
import {InternalServerError} from "./exceptions";
import path from "path";
import {useHooks} from "./utils";

export default class Firefly extends FireflyExtends {
    protected rootPath: string;

    constructor({rootPath}: IFY.FireflyProps) {
        super()
        this.rootPath = rootPath
    }

    use(middleware: IFY.Middleware) {
        this.middlewares.push(middleware);
    }

    router(router_: IFY.Router | IFY.IncludeRouter[]) {
        if (Array.isArray(router_)) {
            router_.forEach(parentRouter => {
                const routers = require(path.join(this.rootPath, parentRouter.appPath.replace(/[.]/g, path.sep), 'router')).default
                routers.forEach((childRouter: IFY.Router) => {
                    childRouter.path = parentRouter.path + childRouter.path
                    this.router(childRouter)
                })
            })
        } else {
            const method = router_.method.toUpperCase()
            const {path, handler} = router_

            if (!this.routes[method]) this.routes[method] = {};
            this.routes[method][path] = handler
        }
    }

    run(port: number, hostname: string = 'localhost', debug: boolean = false) {
        useHooks('tagLog', `Debug : ${debug}`)

        // Exception Handler
        this._exceptionHandler()

        // Init Validation
        this._initValidation()

        // Install Setup Middleware
        this.initSetupMiddleware(this.use.bind(this))

        const server = http.createServer(this.requestListener.bind(this))

        server.listen(port, hostname, () => {
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                useHooks('tagLog', `Localhost server running on http://${hostname}:${port}`)
            } else if (hostname === '0.0.0.0') {
                // Get Network Interface
                const interfaces = require('os').networkInterfaces()
                useHooks('tagLog', 'Network server running on: ')
                Object.keys(interfaces).forEach(key => {
                    const ip = interfaces[key].find((item: any) => item.family === 'IPv4')
                    ip && useHooks('tagLog', `🚀 http://${ip.address}:${port}`)
                })
            } else {
                useHooks('tagLog', `Server running on http://${hostname}:${port}`)
            }
            useHooks('tagLog', `(Press Ctrl+C to stop server)`)
        });
    }

    private requestListener(req: http.IncomingMessage, res: http.ServerResponse) {
        // Init Request
        const request = this.initRequest(req)

        // Request Data Chunks Handler
        this._requestDataChunksHandler(req, request, () => {
            const _dispatch = this.dispatch(request, res)

            // Execute Middleware and Dispatch with Exception Handler
            this._exceptionDispatchHandler(() => {
                this.middlewares.length ? this.middlewares[0](request, res, this.setState.bind(this), _dispatch) : _dispatch()

                if (!this.state.response) {
                    throw new InternalServerError('No response')
                }
            })

            this.response(res, this.state.response!)
        })
    }
}

module.exports = Firefly