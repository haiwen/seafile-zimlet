from fabric.api import local, task
from fabric.api import cd, run, env, local
from fabric.decorators import hosts
from fabric.operations import sudo

@hosts('plt@192.168.1.159')
@task
def deploy(zimlet_name, dev='yes', restart='yes'):
    """Usage: fab deploy helloworld
    """
    local("rm -rf %s.zip" % zimlet_name)
    local("cd %s && rm -rf *~ && zip -r %s * && mv %s.zip .. && cd .." % (zimlet_name, zimlet_name, zimlet_name))
    local('scp %s.zip plt@192.168.1.159:/tmp/' % zimlet_name)

    if dev.startswith('y'):
        zimlet_path = '/opt/zimbra/zimlets/_dev'
    else:
        zimlet_path = '/opt/zimbra/zimlets/'

    with cd(zimlet_path):
        sudo('chown zimbra:zimbra /tmp/%s.zip' % zimlet_name, user='root')
        sudo('mv /tmp/%s.zip . && ls -l | grep %s' % (zimlet_name, zimlet_name),
             user='zimbra')
        sudo('/opt/zimbra/bin/zmzimletctl deploy %s.zip' % zimlet_name, user='zimbra')
        sudo('/opt/zimbra/bin/zmzimletctl listZimlets', user='zimbra')

        if restart.startswith('y'):
            sudo('/opt/zimbra/bin/zmmailboxdctl restart', user='zimbra')
