#include <fltKernel.h>
#include <dontuse.h>

#pragma prefast(disable:__WARNING_ENCODE_MEMBER_FUNCTION_POINTER, "Not valid for kernel mode drivers")

PFLT_FILTER gFilterHandle;
PFLT_PORT gServerPort;
PFLT_PORT gClientPort;

#define IG_PORT_NAME L"\\IntegrityGuardianPort"

NTSTATUS
IgUnload (
    _In_ FLT_FILTER_UNLOAD_FLAGS Flags
    );

FLT_PREOP_CALLBACK_STATUS
IgPreCreate (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    );

CONST FLT_OPERATION_REGISTRATION Callbacks[] = {
    { IRP_MJ_CREATE,
      0,
      IgPreCreate,
      NULL },
    { IRP_MJ_OPERATION_END }
};

CONST FLT_REGISTRATION FilterRegistration = {
    sizeof( FLT_REGISTRATION ),
    FLT_REGISTRATION_VERSION,
    0,                       //  Flags
    NULL,                    //  Context
    Callbacks,               //  Operation callbacks
    IgUnload,                //  MiniFilterUnload
    NULL,                    //  InstanceSetup
    NULL,                    //  InstanceQueryTeardown
    NULL,                    //  InstanceTeardownStart
    NULL,                    //  InstanceTeardownComplete
    NULL,                    //  GenerateFileName
    NULL,                    //  GenerateDestinationFileName
    NULL                     //  NormalizeNameComponent
};

NTSTATUS
DriverEntry (
    _In_ PDRIVER_OBJECT DriverObject,
    _In_ PUNICODE_STRING RegistryPath
    )
{
    NTSTATUS status;

    UNREFERENCED_PARAMETER( RegistryPath );

    // Register with FltMgr
    status = FltRegisterFilter( DriverObject,
                                &FilterRegistration,
                                &gFilterHandle );

    FLT_ASSERT( NT_SUCCESS( status ) );

    if (NT_SUCCESS( status )) {
        // Start filtering i/o
        status = FltStartFiltering( gFilterHandle );

        if (!NT_SUCCESS( status )) {
            FltUnregisterFilter( gFilterHandle );
        }
    }

    return status;
}

NTSTATUS
IgUnload (
    _In_ FLT_FILTER_UNLOAD_FLAGS Flags
    )
{
    UNREFERENCED_PARAMETER( Flags );

    FltUnregisterFilter( gFilterHandle );

    return STATUS_SUCCESS;
}

FLT_PREOP_CALLBACK_STATUS
IgPreCreate (
    _Inout_ PFLT_CALLBACK_DATA Data,
    _In_ PCFLT_RELATED_OBJECTS FltObjects,
    _Flt_CompletionContext_Outptr_ PVOID *CompletionContext
    )
{
    UNREFERENCED_PARAMETER( FltObjects );
    UNREFERENCED_PARAMETER( CompletionContext );

    // Prototype implementation: allow all creates.
    // Full implementation would check FltGetFileNameInformation against protected paths
    // and block unauthorized writes via STATUS_ACCESS_DENIED.

    return FLT_PREOP_SUCCESS_WITH_CALLBACK;
}
