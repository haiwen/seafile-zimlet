from fabric.api import local, task
from fabric.api import cd, run, env, local
from fabric.decorators import hosts
from fabric.operations import sudo

HOST = 'plt@192.168.1.234'
@hosts(HOST)
@task
def deploy(zimlet_name, dev='yes', restart='yes'):
    """Usage: fab deploy helloworld
    """
    if dev.startswith('y'):
        zimlet_path = '/opt/zimbra/zimlets-deployed/_dev/'

        # rsync zimlet folder
        local('rsync -az --delete %s %s:/tmp/' % (zimlet_name, HOST))

        with cd(zimlet_path):
            sudo('chown -R zimbra:zimbra /tmp/%s' % zimlet_name, user='root')
            sudo('rm -rf ./%s && mv /tmp/%s . && ls -l | grep %s' % (zimlet_name, zimlet_name, zimlet_name), user='zimbra')
    else:
        zimlet_path = '/opt/zimbra/zimlets/'

        # prepare .zip bundle
        local("rm -rf %s.zip" % zimlet_name)
        local("cd %s && rm -rf *~ && zip -r %s * && mv %s.zip .. && cd .." % (zimlet_name, zimlet_name, zimlet_name))
        local('scp %s.zip %s:/tmp/' % (zimlet_name, HOST))

        with cd(zimlet_path):
            sudo('chown zimbra:zimbra /tmp/%s.zip' % zimlet_name, user='root')
            sudo('mv /tmp/%s.zip . && ls -l | grep %s' % (zimlet_name, zimlet_name),
                 user='zimbra')

            sudo('/opt/zimbra/bin/zmzimletctl undeploy %s' % zimlet_name, user='zimbra')
            sudo('/opt/zimbra/bin/zmzimletctl deploy %s.zip' % zimlet_name, user='zimbra')

           # sudo('/opt/zimbra/bin/zmzimletctl listZimlets', user='zimbra')

    if restart.startswith('y'):
            sudo('/opt/zimbra/bin/zmmailboxdctl restart', user='zimbra')


@task
def dist(zimlet_name):
    """Usage: fab dist helloworld
    """
    dist_path = './dist/'
    local("rm -rf %s%s.zip" % (dist_path, zimlet_name))
    local("cd %s && rm -rf *~ && zip -r %s * && mv %s.zip ../%s && cd .." % (zimlet_name, zimlet_name, zimlet_name, dist_path))
