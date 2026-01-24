"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";


const ReCAPTCHA = dynamic(() => import("react-google-recaptcha"), { ssr: false });


interface RobotVerificationProps {
    onVerify: (token: string | null) => void;
}

export function RobotVerification({ onVerify }: RobotVerificationProps) {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[400px]">
            <Card className="w-full max-w-md bg-black/40 border-white/10 backdrop-blur-sm rounded-none border-t-2 border-t-white">
                <CardContent className="flex flex-col items-center justify-center py-12">

                    {siteKey ? (
                        <div className="bg-white p-2 rounded-sm shadow-xl">
                            <ReCAPTCHA
                                sitekey={siteKey}
                                onChange={onVerify}
                                theme="light"
                            />
                        </div>
                    ) : (
                        <div className="text-red-500 font-mono text-xs p-4 border border-red-500/20 bg-red-500/5">
                            ERROR: RECAPTCHA SITE KEY NOT FOUND. PLEASE CHECK YOUR .ENV FILE.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
