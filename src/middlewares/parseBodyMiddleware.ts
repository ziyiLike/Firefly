import {useHooks} from "../utils";
import {ParseBodyError} from "../exceptions";
import {useSetupMiddleware} from "../hooks/useSetupMiddleware";
import {parse} from "querystring";

export const parseBodyMiddleware = useSetupMiddleware((req, res, setState, dispatch) => {
    if (useHooks("isIn", req.method, ['POST', 'PATCH', 'PUT', 'DELETE'])) {
        try {
            console.log('content-type -->', req.headers["content-type"])
            if (req.headers["content-type"] === "application/json") {
                req.data = JSON.parse(req.body.__chunksData);
            }
            if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
                req.data = parse(req.body.__chunksData);
            }
            if (req.headers["content-type"]?.startsWith("multipart/form-data")) {
                req.data = useHooks('parseFormData', req.headers["content-type"], req.body.__chunksData)
            }

        } catch (error) {
            throw new ParseBodyError()
        }
        dispatch()
    } else {
        dispatch()
    }
})