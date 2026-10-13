import click
import requests
import json

API_URL = "http://localhost:7890"

@click.group()
def cli():
    """Integrity Guardian Command Line Interface"""
    pass

@cli.command()
def start():
    """Start the IntegrityGuardianService Windows service"""
    import win32serviceutil
    import win32service
    try:
        win32serviceutil.StartService("IntegrityGuardianService")
        click.echo("Service started.")
    except Exception as e:
        click.echo(f"Failed to start service: {e}")

@cli.command()
def stop():
    """Stop the IntegrityGuardianService Windows service"""
    import win32serviceutil
    try:
        win32serviceutil.StopService("IntegrityGuardianService")
        click.echo("Service stopped.")
    except Exception as e:
        click.echo(f"Failed to stop service: {e}")

@cli.command()
def status():
    """Show service state and stats"""
    click.echo("Fetching status...")
    try:
        res = requests.get(f"{API_URL}/events/stats")
        if res.status_code == 200:
            click.echo(json.dumps(res.json(), indent=2))
        else:
            click.echo("Service running but API returned error.")
    except Exception:
        click.echo("Could not connect to API. Is the service running?")

@cli.command()
@click.argument('path')
@click.option('--tier', type=click.Choice(['critical', 'standard', 'informational']), default='standard')
@click.option('--lock', is_flag=True)
def register(path, tier, lock):
    """Add path to monitoring"""
    try:
        res = requests.post(f"{API_URL}/files/register", params={"file_path": path, "tier": tier})
        if res.status_code == 200:
            click.echo(f"Registered {path} [tier={tier}, locked={lock}]")
        else:
            click.echo(f"Failed to register: {res.text}")
    except Exception as e:
        click.echo(f"Could not connect to API. Is the service running? Error: {e}")
    
@cli.command()
@click.argument('path')
def unregister(path):
    """Remove path from monitoring"""
    try:
        res = requests.delete(f"{API_URL}/files/unregister", params={"file_path": path})
        if res.status_code == 200:
            click.echo(f"Unregistered {path}")
        else:
            click.echo(f"Failed to unregister: {res.text}")
    except Exception as e:
        click.echo(f"Could not connect to API. Is the service running? Error: {e}")

@cli.command()
@click.option('--open', 'open_only', is_flag=True)
@click.option('--severity', type=click.Choice(['CRITICAL', 'WARNING', 'INFO']))
def alerts(open_only, severity):
    """List alerts"""
    click.echo(f"Listing alerts (open={open_only}, severity={severity})...")

if __name__ == '__main__':
    cli()
