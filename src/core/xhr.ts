import { AxiosRequestConfig, AxiosPromise, AxiosResponse } from '../types'
import { parseHeaders } from '../helpers/headers'
import { createError } from '../helpers/error'
import { isURLSameOrigin } from '../helpers/url'
import cookie from '../helpers/cookie'

export default function xhr(config: AxiosRequestConfig): AxiosPromise {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'get',
      data = null,
      headers,
      responseType,
      timeout,
      cancelToken,
      withCredentials,
      xsrfCookieName,
      xsrfHeaderName
    } = config

    const request = new XMLHttpRequest()

    if (responseType) {
      request.responseType = responseType
    }

    if (timeout) {
      request.timeout = timeout
    }
    if (withCredentials) {
      request.withCredentials = withCredentials
    }

    request.open(method.toUpperCase(), url!, true)

    request.onreadystatechange = function() {
      if (request.readyState !== 4) {
        return
      }
      if (request.status === 0) {
        return
      }
      const responseHeaders = parseHeaders(request.getAllResponseHeaders())
      const responseData = responseType !== 'text' ? request.response : request.responseText
      const response: AxiosResponse = {
        config,
        request,
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders
      }
      handleResponse(response)
    }

    request.onerror = function() {
      reject(createError('Network Error', config, null, request))
    }

    request.ontimeout = function() {
      reject(createError(`Timeout of ${timeout} ms exceded`, config, 'ECONNABORTED', request))
    }

    if ((withCredentials || isURLSameOrigin(url!)) && xsrfCookieName) {
      const xsrfVal = cookie.read(xsrfCookieName)

      if (xsrfVal && xsrfHeaderName) {
        headers[xsrfHeaderName] = xsrfVal
      }
    }

    Object.keys(headers).forEach(name => {
      if (data === null && name.toLowerCase() === 'content-type') {
        delete headers[name]
      } else {
        request.setRequestHeader(name, headers[name])
      }
    })

    if (cancelToken) {
      cancelToken.promise.then(reason => {
        request.abort()
        reject(reason)
      })
    }

    request.send(data)

    function handleResponse(response: AxiosResponse): void {
      if (response.status >= 200 && response.status < 300) {
        resolve(response)
      } else {
        reject(
          createError(
            `Requset failed with status code ${request.status}`,
            config,
            null,
            request,
            response
          )
        )
      }
    }
  })
}