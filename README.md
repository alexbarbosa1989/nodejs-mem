## Basic NodeJs app to track memory metric

## Deployment in OCP (s2i)
1. Create an OCP project
~~~
oc new-project nodejs-tests
~~~

2. Create a new app referencing the current GitHub repository
~~~
oc new-app nodejs-20:latest~https://github.com/alexbarbosa1989/nodejs-mem.git 
~~~

3. Verify that the pod is running correctly
~~~
oc get pod
NAME                          READY   STATUS      RESTARTS   AGE
nodejs-mem-1-build            0/1     Completed   0          107s
nodejs-mem-75b477b74c-vzsfq   1/1     Running     0          77s
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