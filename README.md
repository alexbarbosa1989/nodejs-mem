## Basic NodeJs app to track memory metric

## Deployment in OCP (s2i)
1. Create an OCP project
~~~
oc new-project nodejs-no-max-tests
~~~

2. Create a new app referencing the current GitHub repository
~~~
oc new-app nodejs-20:latest~https://github.com/alexbarbosa1989/nodejs-mem#no-max-size
~~~

If during the deployment process get below error:
~~~
W0403 14:44:04.334125   42369 dockerimagelookup.go:300] container image remote registry lookup failed: you may not have access to the container image "docker.io/library/nodejs-20:latest"
error: only a partial match was found for "nodejs-20:latest": "registry.access.redhat.com/ubi8/nodejs-20:latest"

The argument "nodejs-20:latest" only partially matched the following container image, OpenShift image stream, or template:

* container image "registry.access.redhat.com/ubi8/nodejs-20:latest", f86aecb, from local, 587.149mb
  Use --image="registry.access.redhat.com/ubi8/nodejs-20:latest" to specify this image or template
~~~
You can import the image from the Red Hat registry to your project:
~~~
oc import-image nodejs-20:latest --from=registry.access.redhat.com/ubi8/nodejs-20:latest --confirm
~~~
then, you can deploy the application using the initial `oc new-app` command:
~~~
oc new-app nodejs-20:latest~https://github.com/alexbarbosa1989/nodejs-mem#no-max-size
~~~
and optionally set resource limits:
~~~
oc set resources deployment nodejs-mem --limits=cpu=1,memory=1Gi
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
