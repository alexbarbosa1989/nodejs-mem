## Basic NodeJs app to track memory metric

## Deployment in OCP (s2i)
1. Create an OCP project
~~~
oc new-project nodejs-alpine
~~~

2. Create a new app referencing the current GitHub repository
Import the Alpine image from the docker registry to your project:
~~~
oc import-image node:20-alpine --from=docker.io/library/node:20-alpine --confirm
~~~
then, you can deploy the application using the initial `oc new-app` command:
~~~
oc new-app node:20-alpine~https://github.com/alexbarbosa1989/nodejs-mem#alpine --strategy=docker
~~~

3. Verify that the pod is running correctly
~~~
oc get pod
NAME                          READY   STATUS      RESTARTS   AGE
nodejs-mem-1-build            0/1     Completed   0          46s
nodejs-mem-787dcbf8cc-gms6j   1/1     Running     0          30s
~~~

4. Expose the service
~~~
oc expose svc nodejs-mem

oc get route
~~~

5. Consume the exposed services:
~~~
Memory stats: http://$OCP_ROUTE/memstats
GC tracing: http://$OCP_ROUTE/gctracing
OOM Trigger: http://$OCP_ROUTE/memory
~~~